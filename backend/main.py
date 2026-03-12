"""
GovProposal AI - FastAPI Backend

Government Proposal AI Generator powered by Google Gemini and SAM.gov API.
"""

import json
import os
import uuid
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from models import (
    VendorProfile,
    ProposalRequest,
    ProposalResponse,
    ProposalSection,
    ExportRequest,
    AVAILABLE_SECTIONS,
)
from services.ai_service import AIService
from services.sam_service import SAMService
from services.export_service import generate_docx, generate_pdf

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
VENDOR_PROFILES_DIR = DATA_DIR / "vendor_profiles"
VENDOR_PROFILES_DIR.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="GovProposal AI",
    description=(
        "AI-powered government contract proposal generator. "
        "Uses Google Gemini for content generation and SAM.gov for opportunity search."
    ),
    version="1.0.0",
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_service = AIService()
sam_service = SAMService()


# ============================================================
# Health Check
# ============================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"message": "GovProposal AI running"}


# ============================================================
# SAM.gov Opportunity Search
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
# Vendor Profile Management
# ============================================================

@app.post("/api/vendor-profile")
async def save_vendor_profile(profile: VendorProfile):
    """
    Save a vendor profile to local storage.

    Profiles are stored as JSON files in data/vendor_profiles/ keyed by company name.
    """
    try:
        # Sanitize filename
        safe_name = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in profile.company_name
        ).strip()

        if not safe_name:
            raise HTTPException(
                status_code=400,
                detail="Company name is required and must contain valid characters.",
            )

        file_path = VENDOR_PROFILES_DIR / f"{safe_name}.json"
        profile_data = profile.model_dump()

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(profile_data, f, indent=2, ensure_ascii=False)

        logger.info("Saved vendor profile: %s", safe_name)
        return {
            "message": f"Vendor profile '{profile.company_name}' saved successfully.",
            "file": str(file_path.name),
            "profile": profile_data,
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
async def list_vendor_profiles():
    """
    List all saved vendor profiles.

    Returns an array of vendor profile objects loaded from local storage.
    """
    try:
        profiles = []
        for file_path in sorted(VENDOR_PROFILES_DIR.glob("*.json")):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    profile_data = json.load(f)
                profiles.append(profile_data)
            except (json.JSONDecodeError, IOError) as exc:
                logger.warning("Skipping invalid profile file %s: %s", file_path, exc)
                continue

        return {
            "count": len(profiles),
            "profiles": profiles,
        }

    except Exception as exc:
        logger.error("Failed to list vendor profiles: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list vendor profiles: {exc}",
        )


# ============================================================
# Proposal Generation
# ============================================================

@app.post("/api/generate-proposal", response_model=ProposalResponse)
async def generate_proposal(request: ProposalRequest):
    """
    Generate a government contract proposal using AI.

    Takes vendor profile, opportunity details, and desired sections.
    Calls Google Gemini to generate professional proposal content for each section.
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
            "Generating proposal for '%s' targeting '%s' (%d sections)",
            request.vendor.get("company_name", "Unknown"),
            request.opportunity.get("title", "Unknown"),
            len(valid_sections),
        )

        # Generate proposal sections via Gemini AI
        generated_sections = ai_service.generate_proposal(
            vendor=request.vendor,
            opportunity=request.opportunity,
            sections=valid_sections,
        )

        # Build response
        proposal_id = str(uuid.uuid4())[:8]
        sections_response = {
            key: ProposalSection(title=val["title"], content=val["content"])
            for key, val in generated_sections.items()
        }

        return ProposalResponse(
            proposal_id=proposal_id,
            opportunity_title=request.opportunity.get("title", "Untitled Opportunity"),
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
# Export Endpoints
# ============================================================

@app.post("/api/export/docx")
async def export_docx(request: ExportRequest):
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
async def export_pdf(request: ExportRequest):
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
