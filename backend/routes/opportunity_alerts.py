"""
Opportunity Alerts API — keyword/NAICS-based alert system.

POST   /api/alerts/create      — Create a new alert
GET    /api/alerts              — List user's alerts
DELETE /api/alerts/{id}         — Delete an alert
GET    /api/alerts/matches      — Get recent alert matches
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, OpportunityAlert
from services.auth_service import get_current_user
from services.sam_service import SAMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["Opportunity Alerts"])

sam_service = SAMService()

# In-memory match cache: user_id -> list of match dicts
_match_cache: dict[str, list] = {}


@router.post("/create")
async def create_alert(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new opportunity alert.

    Body:
    {
        "keywords": "cybersecurity cloud",
        "naics_codes": "541512,541511",
        "frequency_hours": 4,
        "is_active": true
    }
    """
    body = await request.json()
    keywords = body.get("keywords", "").strip()
    naics_codes = body.get("naics_codes", "").strip()
    frequency_hours = body.get("frequency_hours", 4)
    is_active = body.get("is_active", True)

    if not keywords and not naics_codes:
        raise HTTPException(status_code=400, detail="At least one of keywords or naics_codes is required.")

    alert = OpportunityAlert(
        user_id=current_user.id,
        keywords=keywords,
        naics_codes=naics_codes,
        frequency_hours=frequency_hours,
        is_active=is_active,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)

    logger.info("Alert created: user=%s keywords=%s naics=%s", current_user.id, keywords, naics_codes)

    return {"message": "Alert created successfully.", "alert": alert.to_dict()}


@router.get("")
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all alerts for the current user."""
    result = await db.execute(
        select(OpportunityAlert)
        .where(OpportunityAlert.user_id == current_user.id)
        .order_by(OpportunityAlert.created_at.desc())
    )
    alerts = result.scalars().all()

    return {
        "count": len(alerts),
        "alerts": [a.to_dict() for a in alerts],
    }


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert."""
    result = await db.execute(
        select(OpportunityAlert).where(
            OpportunityAlert.id == alert_id,
            OpportunityAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")

    await db.delete(alert)
    await db.flush()

    logger.info("Alert deleted: id=%s user=%s", alert_id, current_user.id)
    return {"message": "Alert deleted."}


@router.get("/matches")
async def get_alert_matches(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run all active alerts and return matching opportunities.

    Searches SAM.gov for each alert's keywords/NAICS codes and aggregates results.
    """
    result = await db.execute(
        select(OpportunityAlert).where(
            OpportunityAlert.user_id == current_user.id,
            OpportunityAlert.is_active == True,
        )
    )
    alerts = result.scalars().all()

    if not alerts:
        return {"count": 0, "matches": [], "message": "No active alerts configured."}

    all_matches = []
    errors = []

    for alert in alerts:
        keywords = alert.keywords.strip() if alert.keywords else None
        naics = alert.naics_codes.split(",")[0].strip() if alert.naics_codes else None

        try:
            results = sam_service.search_opportunities(
                keyword=keywords,
                naics=naics,
                limit=min(limit, 10),
            )
            for r in results:
                r["matched_alert_id"] = alert.id
                r["matched_keywords"] = alert.keywords
                r["matched_naics"] = alert.naics_codes
            all_matches.extend(results)
        except Exception as exc:
            errors.append(f"Alert {alert.id}: {exc}")
            logger.warning("Alert match failed for alert %s: %s", alert.id, exc)

        # Update last_searched_at
        alert.last_searched_at = datetime.now(timezone.utc)
        db.add(alert)

    await db.flush()

    # Deduplicate by title
    seen = set()
    unique_matches = []
    for m in all_matches:
        key = m.get("title", "")
        if key not in seen:
            seen.add(key)
            unique_matches.append(m)

    unique_matches = unique_matches[:limit]

    # Cache matches
    _match_cache[current_user.id] = unique_matches

    return {
        "count": len(unique_matches),
        "matches": unique_matches,
        "alerts_searched": len(alerts),
        "errors": errors if errors else None,
    }
