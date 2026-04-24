"""
Advanced Search API — full-text search across proposals and SAM.gov opportunities.

POST /api/search/proposals       — Search user's proposals
POST /api/search/opportunities   — Advanced SAM.gov filter
GET  /api/search/saved           — Get saved searches
POST /api/search/save            — Save a search
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user
from services.sam_service import SAMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["Advanced Search"])

sam_service = SAMService()

# In-memory saved searches: user_id -> list of saved search dicts
_saved_searches: dict[str, list] = {}


@router.post("/proposals")
async def search_proposals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search across the user's proposals.

    Body:
    {
        "query": "cybersecurity",
        "status": "completed",
        "date_from": "2025-01-01",
        "date_to": "2026-12-31",
        "limit": 20
    }
    """
    body = await request.json()
    query = body.get("query", "").strip()
    status_filter = body.get("status")
    date_from = body.get("date_from")
    date_to = body.get("date_to")
    limit = body.get("limit", 20)

    stmt = select(Proposal).where(Proposal.user_id == current_user.id)

    if query:
        search_pattern = f"%{query}%"
        stmt = stmt.where(
            or_(
                Proposal.title.ilike(search_pattern),
                Proposal.opportunity_title.ilike(search_pattern),
                Proposal.opportunity_agency.ilike(search_pattern),
                Proposal.opportunity_description.ilike(search_pattern),
            )
        )

    if status_filter:
        stmt = stmt.where(Proposal.status == status_filter)

    stmt = stmt.order_by(Proposal.updated_at.desc()).limit(limit)

    result = await db.execute(stmt)
    proposals = result.scalars().all()

    return {
        "query": query,
        "count": len(proposals),
        "proposals": [p.to_dict() for p in proposals],
    }


@router.post("/opportunities")
async def search_opportunities_advanced(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Advanced SAM.gov opportunity search with multiple filters.

    Body:
    {
        "keyword": "IT modernization",
        "naics_code": "541512",
        "set_aside": "SBA",
        "agency": "Department of Defense",
        "posted_from": "2025-01-01",
        "posted_to": "2026-12-31",
        "limit": 25
    }
    """
    body = await request.json()
    keyword = body.get("keyword", "").strip()
    naics_code = body.get("naics_code", "").strip()
    limit = body.get("limit", 25)

    if not keyword and not naics_code:
        raise HTTPException(status_code=400, detail="At least keyword or naics_code is required.")

    try:
        results = sam_service.search_opportunities(
            keyword=keyword or None,
            naics=naics_code or None,
            limit=limit,
        )

        # Apply client-side filters that SAM.gov API doesn't support directly
        agency_filter = body.get("agency", "").strip().lower()
        if agency_filter:
            results = [r for r in results if agency_filter in (r.get("agency", "") or "").lower()]

        for r in results:
            r["source"] = "SAM.gov"

        return {
            "query": {"keyword": keyword, "naics_code": naics_code},
            "count": len(results),
            "opportunities": results,
        }
    except Exception as exc:
        logger.error("Advanced opportunity search failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}")


@router.get("/saved")
async def get_saved_searches(
    current_user: User = Depends(get_current_user),
):
    """Get the user's saved searches."""
    searches = _saved_searches.get(current_user.id, [])
    return {
        "count": len(searches),
        "saved_searches": searches,
    }


@router.post("/save")
async def save_search(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Save a search configuration for later reuse.

    Body:
    {
        "name": "Cyber opportunities",
        "search_type": "opportunities",
        "params": { "keyword": "cybersecurity", "naics_code": "541512" }
    }
    """
    body = await request.json()
    name = body.get("name", "Untitled Search").strip()
    search_type = body.get("search_type", "proposals")
    params = body.get("params", {})

    saved = {
        "id": str(uuid.uuid4()),
        "name": name,
        "search_type": search_type,
        "params": params,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if current_user.id not in _saved_searches:
        _saved_searches[current_user.id] = []
    _saved_searches[current_user.id].append(saved)

    return {"message": "Search saved.", "saved_search": saved}


@router.delete("/saved/{search_id}")
async def delete_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search."""
    searches = _saved_searches.get(current_user.id, [])
    _saved_searches[current_user.id] = [s for s in searches if s["id"] != search_id]
    return {"message": "Saved search deleted."}
