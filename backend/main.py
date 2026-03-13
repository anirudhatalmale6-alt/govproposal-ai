"""
GovProposal AI - FastAPI Backend (SaaS Edition)

Government Proposal AI Generator powered by Google Gemini and SAM.gov API.
Multi-tenant with user authentication, PostgreSQL-ready database, and admin panel.
"""

import json
import os
import uuid
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    VendorProfile,
    ProposalRequest,
    ProposalResponse,
    ProposalSection,
    ExportRequest,
    AVAILABLE_SECTIONS,
)
from database import get_db, create_tables
from db_models import User, VendorProfileDB, Proposal, Subscription, SearchSource
from services.ai_service import AIService
from services.sam_service import SAMService
from services.export_service import generate_docx, generate_pdf
from services.auth_service import (
    get_current_user,
    get_optional_user,
    require_admin,
    hash_password,
    create_access_token,
)
from routes.auth import router as auth_router

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure data directories exist
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="GovProposal AI",
    description=(
        "AI-powered government contract proposal generator. "
        "Uses Google Gemini for content generation and SAM.gov for opportunity search. "
        "Multi-tenant SaaS with user authentication and admin panel."
    ),
    version="2.0.0",
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)

# Initialize services
ai_service = AIService()
sam_service = SAMService()


# ============================================================
# Startup Event — DB init + default admin user
# ============================================================

@app.on_event("startup")
async def on_startup():
    """Create database tables and seed default admin user on first run."""
    logger.info("Starting up — creating database tables...")
    await create_tables()

    # Seed default admin user if it doesn't exist
    from database import async_session_factory

    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(User).where(User.email == "admin@govproposal.ai")
            )
            admin_user = result.scalar_one_or_none()

            if admin_user is None:
                admin_user = User(
                    email="admin@govproposal.ai",
                    hashed_password=hash_password("admin123"),
                    full_name="System Administrator",
                    company_name="GovProposal AI",
                    is_admin=True,
                    subscription_tier="paid",
                )
                db.add(admin_user)
                await db.commit()
                logger.info("Default admin user created: admin@govproposal.ai")
            else:
                logger.info("Default admin user already exists.")

            # Seed default SAM.gov search source
            result = await db.execute(
                select(SearchSource).where(SearchSource.is_default == True)
            )
            default_source = result.scalar_one_or_none()
            if default_source is None:
                sam_source = SearchSource(
                    name="SAM.gov",
                    url="https://sam.gov",
                    description="Official U.S. government system for federal contract opportunities, awards, and entity registrations.",
                    is_default=True,
                    is_active=True,
                )
                db.add(sam_source)
                await db.commit()
                logger.info("Default search source (SAM.gov) created.")

        except Exception as exc:
            await db.rollback()
            logger.error("Failed to seed data: %s", exc)


# ============================================================
# Health Check (public)
# ============================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"message": "GovProposal AI running", "version": "2.0.0"}


# ============================================================
# SAM.gov Opportunity Search (public)
# ============================================================

@app.get("/api/opportunities")
async def search_opportunities(
    keyword: Optional[str] = Query(None, description="Search keyword for opportunities"),
    naics: Optional[str] = Query(None, description="NAICS code filter"),
    limit: int = Query(10, ge=1, le=100, description="Max results to return"),
):
    """
    Search SAM.gov for federal contract opportunities.

    Queries the SAM.gov Opportunities API and returns matching results
    with title, agency, due date, and other details.
    """
    try:
        results = sam_service.search_opportunities(
            keyword=keyword,
            naics=naics,
            limit=limit,
        )
        return {
            "keyword": keyword,
            "count": len(results),
            "opportunities": results,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.error("Opportunity search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search opportunities: {exc}",
        )


# ============================================================
# Vendor Profile Management (authenticated, scoped to user)
# ============================================================

@app.post("/api/vendor-profile")
async def save_vendor_profile(
    profile: VendorProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a vendor profile to the database, scoped to the current user.

    If the user already has a profile with the same company name, it is updated.
    Otherwise, a new profile is created.
    """
    try:
        # Check if user already has a profile with this company name
        result = await db.execute(
            select(VendorProfileDB).where(
                VendorProfileDB.user_id == current_user.id,
                VendorProfileDB.company_name == profile.company_name,
            )
        )
        existing = result.scalar_one_or_none()

        contact_dict = profile.contact_info.model_dump() if profile.contact_info else {}

        if existing:
            # Update existing profile
            existing.cage_code = profile.cage_code
            existing.duns_number = profile.duns_number
            existing.naics_codes = profile.naics_codes
            existing.capabilities = profile.capabilities
            existing.past_performance = profile.past_performance
            existing.socioeconomic_status = profile.socioeconomic_status
            existing.contact_info = contact_dict
            db.add(existing)
            await db.flush()
            profile_data = existing.to_dict()
            logger.info("Updated vendor profile: %s (user: %s)", profile.company_name, current_user.email)
        else:
            # Create new profile
            new_profile = VendorProfileDB(
                user_id=current_user.id,
                company_name=profile.company_name,
                cage_code=profile.cage_code,
                duns_number=profile.duns_number,
                naics_codes=profile.naics_codes,
                capabilities=profile.capabilities,
                past_performance=profile.past_performance,
                socioeconomic_status=profile.socioeconomic_status,
                contact_info=contact_dict,
            )
            db.add(new_profile)
            await db.flush()
            profile_data = new_profile.to_dict()
            logger.info("Created vendor profile: %s (user: %s)", profile.company_name, current_user.email)

        # Return in the same format as original API for frontend compatibility
        return {
            "message": f"Vendor profile '{profile.company_name}' saved successfully.",
            "profile": profile.model_dump(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to save vendor profile: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save vendor profile: {exc}",
        )


@app.get("/api/vendor-profiles")
async def list_vendor_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all vendor profiles belonging to the current user.
    """
    try:
        result = await db.execute(
            select(VendorProfileDB)
            .where(VendorProfileDB.user_id == current_user.id)
            .order_by(VendorProfileDB.created_at.desc())
        )
        profiles = result.scalars().all()

        # Return in the same format as original API for frontend compatibility
        profiles_data = []
        for p in profiles:
            profiles_data.append({
                "id": p.id,
                "company_name": p.company_name,
                "cage_code": p.cage_code,
                "duns_number": p.duns_number,
                "naics_codes": p.naics_codes or [],
                "capabilities": p.capabilities,
                "past_performance": p.past_performance,
                "socioeconomic_status": p.socioeconomic_status,
                "contact_info": p.contact_info or {},
            })

        return {
            "count": len(profiles_data),
            "profiles": profiles_data,
        }

    except Exception as exc:
        logger.error("Failed to list vendor profiles: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list vendor profiles: {exc}",
        )


# ============================================================
# Proposal Generation (authenticated)
# ============================================================

@app.post("/api/generate-proposal", response_model=ProposalResponse)
async def generate_proposal(
    request: ProposalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a government contract proposal using AI.

    Takes vendor profile, opportunity details, and desired sections.
    Calls Google Gemini to generate professional proposal content for each section.
    Saves the generated proposal to the database.
    """
    try:
        # Validate requested sections
        valid_sections = []
        for section in request.sections:
            if section in AVAILABLE_SECTIONS:
                valid_sections.append(section)
            else:
                logger.warning("Ignoring unknown section: %s", section)

        if not valid_sections:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No valid sections requested. "
                    f"Available sections: {AVAILABLE_SECTIONS}"
                ),
            )

        logger.info(
            "Generating proposal for '%s' targeting '%s' (%d sections) [user: %s]",
            request.vendor.get("company_name", "Unknown"),
            request.opportunity.get("title", "Unknown"),
            len(valid_sections),
            current_user.email,
        )

        # Generate proposal sections via Gemini AI
        generated_sections = ai_service.generate_proposal(
            vendor=request.vendor,
            opportunity=request.opportunity,
            sections=valid_sections,
        )

        # Build response
        proposal_id = str(uuid.uuid4())
        sections_response = {
            key: ProposalSection(title=val["title"], content=val["content"])
            for key, val in generated_sections.items()
        }

        # Save proposal to database
        opp_title = request.opportunity.get("title", "Untitled Opportunity")
        opp_agency = request.opportunity.get("agency", "")
        opp_desc = request.opportunity.get("description", "")

        db_proposal = Proposal(
            id=proposal_id,
            user_id=current_user.id,
            title=f"Proposal for {opp_title}",
            opportunity_title=opp_title,
            opportunity_agency=opp_agency,
            opportunity_description=opp_desc,
            sections={
                key: {"title": val["title"], "content": val["content"]}
                for key, val in generated_sections.items()
            },
            status="completed",
        )
        db.add(db_proposal)
        await db.flush()

        logger.info("Proposal saved to DB: %s (user: %s)", proposal_id, current_user.email)

        return ProposalResponse(
            proposal_id=proposal_id,
            opportunity_title=opp_title,
            vendor_name=request.vendor.get("company_name", "Unknown Vendor"),
            sections=sections_response,
        )

    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.error("Proposal generation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate proposal: {exc}",
        )


# ============================================================
# Proposal CRUD (authenticated, scoped to user)
# ============================================================

@app.get("/api/proposals")
async def list_proposals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all proposals belonging to the current user.
    """
    result = await db.execute(
        select(Proposal)
        .where(Proposal.user_id == current_user.id)
        .order_by(Proposal.created_at.desc())
    )
    proposals = result.scalars().all()

    return {
        "count": len(proposals),
        "proposals": [p.to_dict() for p in proposals],
    }


@app.get("/api/proposals/{proposal_id}")
async def get_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific proposal by ID (must belong to the current user).
    """
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()

    if proposal is None:
        raise HTTPException(
            status_code=404,
            detail="Proposal not found.",
        )

    return {"proposal": proposal.to_dict()}


@app.delete("/api/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a specific proposal by ID (must belong to the current user).
    """
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()

    if proposal is None:
        raise HTTPException(
            status_code=404,
            detail="Proposal not found.",
        )

    await db.delete(proposal)
    await db.flush()

    logger.info("Proposal deleted: %s (user: %s)", proposal_id, current_user.email)

    return {"message": "Proposal deleted successfully."}


# ============================================================
# Search Sources (authenticated — master list of opportunity websites)
# ============================================================

@app.get("/api/search-sources")
async def list_search_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active search sources (master list)."""
    result = await db.execute(
        select(SearchSource)
        .where(SearchSource.is_active == True)
        .order_by(SearchSource.is_default.desc(), SearchSource.created_at.asc())
    )
    sources = result.scalars().all()
    return {
        "count": len(sources),
        "sources": [s.to_dict() for s in sources],
    }


@app.post("/api/search-sources")
async def add_search_source(
    source: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new opportunity website to the master search list."""
    name = source.get("name", "").strip()
    url = source.get("url", "").strip()
    description = source.get("description", "").strip()

    if not name or not url:
        raise HTTPException(status_code=400, detail="Name and URL are required.")

    # Check if URL already exists
    result = await db.execute(
        select(SearchSource).where(SearchSource.url == url)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="This URL is already in the search source list.")

    new_source = SearchSource(
        name=name,
        url=url,
        description=description,
        is_default=False,
        is_active=True,
        added_by=current_user.id,
    )
    db.add(new_source)
    await db.flush()

    logger.info("Search source added: %s (%s) by %s", name, url, current_user.email)

    return {"message": f"Source '{name}' added to master search list.", "source": new_source.to_dict()}


@app.delete("/api/search-sources/{source_id}")
async def delete_search_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a search source from the master list. Default sources (SAM.gov) cannot be removed."""
    result = await db.execute(
        select(SearchSource).where(SearchSource.id == source_id)
    )
    source = result.scalar_one_or_none()

    if source is None:
        raise HTTPException(status_code=404, detail="Search source not found.")

    if source.is_default:
        raise HTTPException(status_code=400, detail="Default sources cannot be removed.")

    await db.delete(source)
    await db.flush()

    logger.info("Search source removed: %s (by %s)", source.name, current_user.email)

    return {"message": f"Source '{source.name}' removed from master search list."}


# ============================================================
# Export Endpoints (authenticated)
# ============================================================

@app.post("/api/export/docx")
async def export_docx(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Export proposal sections as a formatted Word document (.docx).

    Returns the document as a downloadable file.
    """
    try:
        proposal_data = {
            "proposal_title": request.proposal_title,
            "vendor_name": request.vendor_name,
            "sections": {
                key: {"title": section.title, "content": section.content}
                for key, section in request.sections.items()
            },
        }

        buffer = generate_docx(proposal_data)

        # Generate filename
        safe_title = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in request.proposal_title
        ).strip()[:50]
        filename = f"{safe_title or 'Proposal'}.docx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("DOCX export failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export DOCX: {exc}",
        )


@app.post("/api/export/pdf")
async def export_pdf(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Export proposal sections as a formatted PDF document.

    Returns the document as a downloadable file.
    """
    try:
        proposal_data = {
            "proposal_title": request.proposal_title,
            "vendor_name": request.vendor_name,
            "sections": {
                key: {"title": section.title, "content": section.content}
                for key, section in request.sections.items()
            },
        }

        buffer = generate_pdf(proposal_data)

        # Generate filename
        safe_title = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in request.proposal_title
        ).strip()[:50]
        filename = f"{safe_title or 'Proposal'}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("PDF export failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export PDF: {exc}",
        )


# ============================================================
# Admin Endpoints (admin only)
# ============================================================

@app.get("/api/admin/users")
async def admin_list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users in the system (admin only).
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return {
        "count": len(users),
        "users": [u.to_dict() for u in users],
    }


@app.get("/api/admin/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get platform-wide statistics (admin only).

    Returns total users, total proposals, and active subscription count.
    """
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0

    # Total proposals
    result = await db.execute(select(func.count(Proposal.id)))
    total_proposals = result.scalar() or 0

    # Active subscriptions
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    )
    active_subscriptions = result.scalar() or 0

    # Users by tier
    result = await db.execute(
        select(User.subscription_tier, func.count(User.id)).group_by(User.subscription_tier)
    )
    tier_counts = {row[0]: row[1] for row in result.all()}

    return {
        "total_users": total_users,
        "total_proposals": total_proposals,
        "active_subscriptions": active_subscriptions,
        "users_by_tier": tier_counts,
    }


@app.put("/api/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    update: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's admin status or subscription tier (admin only).

    Accepted fields in body: is_admin (bool), subscription_tier (str: "free" or "paid").
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if "is_admin" in update:
        user.is_admin = bool(update["is_admin"])
    if "subscription_tier" in update:
        tier = update["subscription_tier"]
        if tier not in ("free", "paid"):
            raise HTTPException(
                status_code=400,
                detail="subscription_tier must be 'free' or 'paid'.",
            )
        user.subscription_tier = tier
    if "full_name" in update:
        user.full_name = update["full_name"]
    if "company_name" in update:
        user.company_name = update["company_name"]

    db.add(user)
    await db.flush()

    logger.info("Admin updated user %s: %s", user_id, update)

    return {"message": "User updated.", "user": user.to_dict()}


# ============================================================
# Serve React Frontend (static files)
# ============================================================

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse

    # Mount static assets
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    # Catch-all route for SPA - must be after all API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        # Try to serve the specific file first
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html for SPA routing
        return FileResponse(str(FRONTEND_DIST / "index.html"))


# ============================================================
# Run with uvicorn
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
