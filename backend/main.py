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
from fastapi import FastAPI, HTTPException, Query, Depends, Request
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
from db_models import User, VendorProfileDB, Proposal, Subscription, SearchSource, ProposalTemplate, FavoriteTemplate, ProposalShare, AuditLog
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

from services.usaspending_service import USASpendingService
usaspending_service = USASpendingService()

from services.market_research_service import MarketResearchService
market_research_service = MarketResearchService()


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

            # Seed default search sources
            result = await db.execute(
                select(SearchSource).where(SearchSource.is_default == True)
            )
            default_sources = result.scalars().all()
            existing_names = {s.name for s in default_sources}

            new_sources = []
            if "SAM.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="SAM.gov",
                    url="https://sam.gov",
                    description="Official U.S. government system for federal contract opportunities, awards, and entity registrations.",
                    is_default=True,
                    is_active=True,
                ))
            if "USASpending.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="USASpending.gov",
                    url="https://www.usaspending.gov/search",
                    description="Comprehensive U.S. government spending data — search contract awards, grants, and federal spending by agency, NAICS, and keyword.",
                    is_default=True,
                    is_active=True,
                ))
            if "SBA.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="SBA.gov",
                    url="https://www.sba.gov/federal-contracting",
                    description="Small Business Administration — federal contracting resources, set-aside programs, 8(a), HUBZone, and small business certifications.",
                    is_default=True,
                    is_active=True,
                ))
            if "GSA.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="GSA.gov",
                    url="https://www.gsa.gov",
                    description="General Services Administration — GSA Schedules, government-wide contracts, and procurement resources.",
                    is_default=True,
                    is_active=True,
                ))

            if new_sources:
                for src in new_sources:
                    db.add(src)
                await db.commit()
                logger.info("Seeded %d default search sources.", len(new_sources))

            # Seed proposal templates
            from seed_templates import get_seed_templates

            result = await db.execute(select(func.count(ProposalTemplate.id)))
            template_count = result.scalar() or 0
            if template_count == 0:
                for tpl_data in get_seed_templates():
                    tpl = ProposalTemplate(**tpl_data)
                    db.add(tpl)
                await db.commit()
                logger.info("Seeded %d proposal templates.", len(get_seed_templates()))

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
    source: Optional[str] = Query(None, description="Search source: sam, usaspending, gsa, or all"),
):
    """
    Search federal contract opportunities across multiple sources.

    Supported sources:
    - sam: SAM.gov Opportunities API (default)
    - usaspending: USASpending.gov Awards API (free, no key)
    - gsa: GSA.gov (uses SAM.gov API)
    - all: Search all sources and combine results
    """
    source = (source or "all").lower()
    all_results = []
    errors = []

    try:
        # SAM.gov search
        if source in ("sam", "gsa", "all"):
            try:
                sam_results = sam_service.search_opportunities(
                    keyword=keyword, naics=naics, limit=limit,
                )
                for r in sam_results:
                    r["source"] = "SAM.gov"
                all_results.extend(sam_results)
            except Exception as exc:
                errors.append(f"SAM.gov: {exc}")

        # USASpending.gov search
        if source in ("usaspending", "all"):
            try:
                usa_results = usaspending_service.search_awards(
                    keyword=keyword or "", naics=naics, limit=limit,
                )
                all_results.extend(usa_results)
            except Exception as exc:
                errors.append(f"USASpending.gov: {exc}")

        # Limit total results
        all_results = all_results[:limit]

        return {
            "keyword": keyword,
            "count": len(all_results),
            "opportunities": all_results,
            "sources_searched": source,
            "errors": errors if errors else None,
        }
    except Exception as exc:
        logger.error("Opportunity search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search opportunities: {exc}",
        )


# ============================================================
# Market Research & Pricing Intelligence (authenticated)
# ============================================================


@app.get("/api/market-research/labor-rates")
async def market_research_labor_rates(
    labor_category: str = Query(..., description="Labor category to research (e.g. 'Software Engineer')"),
    naics_code: Optional[str] = Query(None, description="NAICS code filter (e.g. '541512')"),
    location: Optional[str] = Query(None, description="State or location filter"),
    current_user: User = Depends(get_current_user),
):
    """
    Search for labor rate intelligence for a given category.

    Returns average, min, max, and median hourly rates derived from
    USASpending.gov award data and GSA Schedule benchmarks.
    """
    try:
        result = await market_research_service.search_labor_rates(
            labor_category=labor_category,
            naics_code=naics_code,
            location=location,
        )
        return result
    except Exception as exc:
        logger.error("Labor rate search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search labor rates: {exc}",
        )


@app.get("/api/market-research/competitor-awards")
async def market_research_competitor_awards(
    naics_code: Optional[str] = Query(None, description="NAICS code filter"),
    agency: Optional[str] = Query(None, description="Awarding agency name filter"),
    keyword: Optional[str] = Query(None, description="Keyword to search in award descriptions"),
    current_user: User = Depends(get_current_user),
):
    """
    Search historical contract awards for competitor analysis.

    Returns vendor summaries, award details, and market insights.
    At least one filter (naics_code, agency, or keyword) is recommended.
    """
    if not naics_code and not agency and not keyword:
        raise HTTPException(
            status_code=400,
            detail="At least one filter is required: naics_code, agency, or keyword.",
        )

    try:
        result = await market_research_service.search_competitor_awards(
            naics_code=naics_code,
            agency=agency,
            keyword=keyword,
        )
        return result
    except Exception as exc:
        logger.error("Competitor award search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search competitor awards: {exc}",
        )


@app.post("/api/market-research/pricing-recommendation")
async def market_research_pricing_recommendation(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered pricing strategy recommendations.

    Request body:
    {
        "labor_categories": [
            {"category": "Software Engineer", "rate": 145},
            {"category": "Project Manager", "rate": 160}
        ],
        "competitor_data": { ... }  // optional, from competitor-awards endpoint
    }

    Returns competitive, balanced, and premium pricing strategies
    with win probability estimates and actionable recommendations.
    """
    labor_categories = body.get("labor_categories", [])
    if not labor_categories:
        raise HTTPException(
            status_code=400,
            detail="labor_categories is required and must be a non-empty list of {category, rate} objects.",
        )

    # Validate each entry
    for i, item in enumerate(labor_categories):
        if not isinstance(item, dict) or "category" not in item or "rate" not in item:
            raise HTTPException(
                status_code=400,
                detail=f"labor_categories[{i}] must have 'category' (str) and 'rate' (number) fields.",
            )
        try:
            item["rate"] = float(item["rate"])
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"labor_categories[{i}].rate must be a valid number.",
            )

    competitor_data = body.get("competitor_data")

    try:
        result = market_research_service.get_pricing_recommendation(
            labor_categories=labor_categories,
            competitor_data=competitor_data,
        )
        return result
    except Exception as exc:
        logger.error("Pricing recommendation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pricing recommendation: {exc}",
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
    req: Request,
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

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="created_proposal",
            proposal_id=proposal_id,
            details=json.dumps({"title": opp_title, "sections": len(valid_sections)}),
            ip_address=req.client.host if req.client else None,
        )

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
# Proposal Templates (authenticated)
# ============================================================

@app.get("/api/templates")
async def list_templates(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all proposal templates, optionally filtered by category."""
    query = select(ProposalTemplate)
    if category:
        query = query.where(ProposalTemplate.category == category)
    query = query.order_by(ProposalTemplate.category, ProposalTemplate.name)

    result = await db.execute(query)
    templates = result.scalars().all()

    # Get user's favorites
    fav_result = await db.execute(
        select(FavoriteTemplate.template_id).where(FavoriteTemplate.user_id == current_user.id)
    )
    fav_ids = set(row[0] for row in fav_result.all())

    # Get unique categories
    cat_result = await db.execute(
        select(ProposalTemplate.category).distinct()
    )
    categories = sorted([row[0] for row in cat_result.all()])

    templates_data = []
    for t in templates:
        d = t.to_dict()
        d["is_favorite"] = t.id in fav_ids
        # Don't include full sections in list view (too large)
        d.pop("sections", None)
        templates_data.append(d)

    return {
        "count": len(templates_data),
        "categories": categories,
        "templates": templates_data,
    }


@app.get("/api/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific template with full sections content."""
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check if favorited
    fav_result = await db.execute(
        select(FavoriteTemplate).where(
            FavoriteTemplate.user_id == current_user.id,
            FavoriteTemplate.template_id == template_id,
        )
    )
    is_fav = fav_result.scalar_one_or_none() is not None

    data = template.to_dict()
    data["is_favorite"] = is_fav
    return {"template": data}


@app.post("/api/templates/{template_id}/use")
async def use_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a template as used (increment use count) and return its full data."""
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    template.use_count = (template.use_count or 0) + 1
    db.add(template)
    await db.flush()

    return {"template": template.to_dict()}


@app.post("/api/templates/{template_id}/favorite")
async def toggle_favorite(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite status of a template for the current user."""
    # Check template exists
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check existing favorite
    result = await db.execute(
        select(FavoriteTemplate).where(
            FavoriteTemplate.user_id == current_user.id,
            FavoriteTemplate.template_id == template_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.flush()
        return {"favorited": False, "message": "Template removed from favorites."}
    else:
        fav = FavoriteTemplate(user_id=current_user.id, template_id=template_id)
        db.add(fav)
        await db.flush()
        return {"favorited": True, "message": "Template added to favorites."}


# ============================================================
# Export Endpoints (authenticated)
# ============================================================

@app.post("/api/export/docx")
async def export_docx(
    request: ExportRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="exported_docx",
            details=json.dumps({"title": request.proposal_title}),
            ip_address=req.client.host if req.client else None,
        )

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
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="exported_pdf",
            details=json.dumps({"title": request.proposal_title}),
            ip_address=req.client.host if req.client else None,
        )

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
# Payment / Subscription Endpoints
# ============================================================

from services.payment_service import stripe_service, razorpay_service, PLANS

@app.get("/api/plans")
async def get_plans():
    """Get available subscription plans."""
    return {"plans": PLANS}


@app.post("/api/payments/stripe/checkout")
async def stripe_checkout(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe checkout session."""
    plan = body.get("plan", "professional")
    base_url = body.get("base_url", "http://localhost:8000")

    result = stripe_service.create_checkout_session(
        plan=plan,
        user_email=current_user.email,
        user_id=current_user.id,
        success_url=f"{base_url}/dashboard?payment=success&plan={plan}",
        cancel_url=f"{base_url}/billing?payment=cancelled",
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/payments/stripe/webhook")
async def stripe_webhook(request_obj=None):
    """Handle Stripe webhook events."""
    from starlette.requests import Request
    from fastapi import Request as FR

    # Get the raw request
    import starlette
    # This endpoint uses raw body
    return {"received": True}


@app.post("/api/payments/razorpay/order")
async def razorpay_create_order(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Create a Razorpay order."""
    plan = body.get("plan", "professional")
    result = razorpay_service.create_order(plan=plan, user_id=current_user.id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/payments/razorpay/verify")
async def razorpay_verify_payment(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment and activate subscription."""
    order_id = body.get("order_id", "")
    payment_id = body.get("payment_id", "")
    signature = body.get("signature", "")
    plan = body.get("plan", "professional")

    is_valid = razorpay_service.verify_payment(order_id, payment_id, signature)

    if is_valid:
        # Update user's subscription tier
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_tier = "paid" if plan in ("professional", "enterprise") else "free"
            db.add(user)
            await db.flush()
        return {"verified": True, "plan": plan}
    else:
        raise HTTPException(status_code=400, detail="Payment verification failed")


@app.get("/api/payments/config")
async def payment_config():
    """Get payment gateway configuration (public keys only)."""
    return {
        "stripe": {
            "configured": stripe_service.is_configured,
            "publishable_key": stripe_service.publishable_key if stripe_service.is_configured else None,
        },
        "razorpay": {
            "configured": razorpay_service.is_configured,
            "key_id": razorpay_service.key_id if razorpay_service.is_configured else None,
        },
    }


# ============================================================
# Image Upload for Proposals
# ============================================================

UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

from fastapi import UploadFile, File

@app.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload an image for use in proposal sections (logo, photos, etc.)."""
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed. Use PNG, JPEG, GIF, WebP, or SVG.")

    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    # Save to user-specific directory
    user_dir = UPLOADS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/api/uploads/{current_user.id}/{unique_name}"
    logger.info("Image uploaded by user %s: %s", current_user.id, unique_name)

    return {"url": image_url, "filename": unique_name, "size": len(contents)}


@app.get("/api/uploads/{user_id}/{filename}")
async def serve_upload(user_id: int, filename: str):
    """Serve uploaded images."""
    from fastapi.responses import FileResponse as FR
    file_path = UPLOADS_DIR / str(user_id) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FR(str(file_path))


@app.delete("/api/upload-image/{filename}")
async def delete_image(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an uploaded image."""
    file_path = UPLOADS_DIR / str(current_user.id) / filename
    if file_path.exists():
        file_path.unlink()
        return {"message": "Image deleted."}
    raise HTTPException(status_code=404, detail="Image not found")


# ============================================================
# Audit Log Helper
# ============================================================

async def log_audit(
    db: AsyncSession,
    user_id: str,
    action: str,
    proposal_id: str = None,
    details: str = None,
    ip_address: str = None,
):
    """Create an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        proposal_id=proposal_id,
        action=action,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    logger.info("Audit log: user=%s action=%s proposal=%s", user_id, action, proposal_id)


# ============================================================
# Proposal Share Endpoints (authenticated + one public)
# ============================================================

@app.post("/api/proposals/{proposal_id}/share")
async def create_share_link(
    proposal_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a shareable link for a proposal draft."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    share = ProposalShare(
        proposal_id=proposal_id,
        created_by=current_user.id,
    )
    db.add(share)
    await db.flush()

    # Audit log
    await log_audit(
        db,
        user_id=current_user.id,
        action="shared_proposal",
        proposal_id=proposal_id,
        details=json.dumps({"share_token": share.share_token}),
        ip_address=request.client.host if request.client else None,
    )

    logger.info("Share link created for proposal %s by %s", proposal_id, current_user.email)

    return {
        "share": share.to_dict(),
        "share_url": f"/shared/{share.share_token}",
    }


@app.get("/api/proposals/{proposal_id}/shares")
async def list_share_links(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active share links for a proposal."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    result = await db.execute(
        select(ProposalShare).where(
            ProposalShare.proposal_id == proposal_id,
            ProposalShare.is_active == True,
        ).order_by(ProposalShare.created_at.desc())
    )
    shares = result.scalars().all()

    return {
        "count": len(shares),
        "shares": [s.to_dict() for s in shares],
    }


@app.delete("/api/proposals/{proposal_id}/share/{share_id}")
async def deactivate_share_link(
    proposal_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a share link."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    result = await db.execute(
        select(ProposalShare).where(
            ProposalShare.id == share_id,
            ProposalShare.proposal_id == proposal_id,
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail="Share link not found.")

    share.is_active = False
    db.add(share)
    await db.flush()

    logger.info("Share link deactivated: %s (user: %s)", share_id, current_user.email)

    return {"message": "Share link deactivated."}


@app.get("/api/shared/{share_token}")
async def get_shared_proposal(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — view a shared proposal draft (no auth required).
    Checks that the share link is active and not expired.
    """
    from datetime import datetime, timezone

    result = await db.execute(
        select(ProposalShare).where(ProposalShare.share_token == share_token)
    )
    share = result.scalar_one_or_none()

    if share is None or not share.is_active:
        raise HTTPException(status_code=404, detail="Share link not found or has been deactivated.")

    # Check expiry
    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This share link has expired.")

    # Get proposal
    result = await db.execute(
        select(Proposal).where(Proposal.id == share.proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal no longer exists.")

    # Get creator info
    result = await db.execute(
        select(User).where(User.id == share.created_by)
    )
    creator = result.scalar_one_or_none()

    return {
        "proposal": proposal.to_dict(),
        "shared_by": creator.full_name if creator else "Unknown",
        "shared_on": share.created_at.isoformat() if share.created_at else None,
    }


# ============================================================
# Audit Log Endpoint (authenticated)
# ============================================================

@app.get("/api/audit-log")
async def get_audit_log(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit log entries for the current user.
    Supports pagination with limit/offset.
    """
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    entries = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "entries": [e.to_dict() for e in entries],
    }


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

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
