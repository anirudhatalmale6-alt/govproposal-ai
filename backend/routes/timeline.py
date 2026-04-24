"""
Proposal Timeline API — activity history for proposals and team.

GET /api/timeline/proposal/{id} — All activities for a proposal
GET /api/timeline/team           — Team-wide recent activity
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal, AuditLog
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/timeline", tags=["Proposal Timeline"])


@router.get("/proposal/{proposal_id}")
async def proposal_timeline(
    proposal_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full activity timeline for a specific proposal.

    Returns audit log entries, comments, version saves, scoring, and exports
    related to this proposal in reverse chronological order.
    """
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

    # Get audit log entries for this proposal
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.proposal_id == proposal_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    entries = result.scalars().all()

    # Enrich with user info
    timeline_items = []
    for entry in entries:
        # Get actor name
        user_result = await db.execute(select(User).where(User.id == entry.user_id))
        actor = user_result.scalar_one_or_none()

        item = {
            "id": entry.id,
            "action": entry.action,
            "actor": actor.full_name or actor.email if actor else "Unknown",
            "actor_email": actor.email if actor else None,
            "details": entry.details,
            "ip_address": entry.ip_address,
            "timestamp": entry.created_at.isoformat() if entry.created_at else None,
        }

        # Map action to human-readable label and icon hint
        action_labels = {
            "created_proposal": "Created proposal",
            "exported_pdf": "Exported as PDF",
            "exported_docx": "Exported as DOCX",
            "shared_proposal": "Shared proposal link",
            "scored_proposal": "Scored proposal",
            "added_comment": "Added comment",
            "saved_version": "Saved version",
            "updated_proposal": "Updated proposal",
        }
        item["label"] = action_labels.get(entry.action, entry.action.replace("_", " ").title())

        timeline_items.append(item)

    # Also include proposal creation as a base event if not in audit log
    if not any(t["action"] == "created_proposal" for t in timeline_items):
        timeline_items.append({
            "id": f"genesis-{proposal_id}",
            "action": "created_proposal",
            "label": "Proposal created",
            "actor": current_user.full_name or current_user.email,
            "actor_email": current_user.email,
            "details": None,
            "ip_address": None,
            "timestamp": proposal.created_at.isoformat() if proposal.created_at else None,
        })

    # Sort by timestamp descending
    timeline_items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return {
        "proposal_id": proposal_id,
        "proposal_title": proposal.title,
        "count": len(timeline_items),
        "timeline": timeline_items,
    }


@router.get("/team")
async def team_timeline(
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent activity across all the user's proposals (team-wide view).
    """
    # Get recent audit log entries for the user
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    entries = result.scalars().all()

    timeline_items = []
    for entry in entries:
        # Get proposal title if available
        proposal_title = None
        if entry.proposal_id:
            p_result = await db.execute(
                select(Proposal.title).where(Proposal.id == entry.proposal_id)
            )
            row = p_result.first()
            if row:
                proposal_title = row[0]

        action_labels = {
            "created_proposal": "Created proposal",
            "exported_pdf": "Exported as PDF",
            "exported_docx": "Exported as DOCX",
            "shared_proposal": "Shared proposal",
            "scored_proposal": "Scored proposal",
            "added_comment": "Added comment",
            "saved_version": "Saved version",
            "login": "Logged in",
        }

        timeline_items.append({
            "id": entry.id,
            "action": entry.action,
            "label": action_labels.get(entry.action, entry.action.replace("_", " ").title()),
            "proposal_id": entry.proposal_id,
            "proposal_title": proposal_title,
            "details": entry.details,
            "timestamp": entry.created_at.isoformat() if entry.created_at else None,
        })

    return {
        "count": len(timeline_items),
        "timeline": timeline_items,
    }
