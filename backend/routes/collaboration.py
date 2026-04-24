"""
Team Collaboration API endpoints.

POST /api/proposals/{id}/comments — Add a comment
GET  /api/proposals/{id}/comments — Get all comments
POST /api/proposals/{id}/share — Share proposal (existing endpoint extended)
GET  /api/proposals/{id}/versions — Get version history
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Collaboration"])


@router.post("/api/proposals/{proposal_id}/comments")
async def add_comment(
    proposal_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a comment to a proposal.

    Body:
    {
        "content": "This section needs more detail on the staffing plan.",
        "section_key": "staffing_plan",  // optional
        "parent_id": null               // optional, for threaded replies
    }
    """
    # Verify proposal exists and user has access
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    # Only proposal owner can comment (in production, add team member check)
    if proposal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    body = await request.json()
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content is required.")

    section_key = body.get("section_key")
    parent_id = body.get("parent_id")

    # Create comment
    from collab_models.comment import Comment

    comment = Comment(
        proposal_id=proposal_id,
        user_id=current_user.id,
        content=content,
        section_key=section_key,
        parent_id=parent_id,
    )
    db.add(comment)
    await db.flush()

    # Notify proposal owner if commenter is different (for team collaboration)
    if proposal.user_id != current_user.id:
        commenter_name = current_user.full_name or current_user.email
        notification_service.notify_comment(
            user_id=proposal.user_id,
            commenter_name=commenter_name,
            proposal_title=proposal.title,
            proposal_id=proposal_id,
        )

    logger.info("Comment added to proposal %s by %s", proposal_id, current_user.email)

    return {
        "message": "Comment added.",
        "comment": comment.to_dict(),
    }


@router.get("/api/proposals/{proposal_id}/comments")
async def get_comments(
    proposal_id: str,
    section_key: str = Query(None, description="Filter by section key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all comments on a proposal.

    Optionally filter by section_key.
    """
    # Verify access
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    if proposal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    from collab_models.comment import Comment

    query = select(Comment).where(Comment.proposal_id == proposal_id)
    if section_key:
        query = query.where(Comment.section_key == section_key)
    query = query.order_by(Comment.created_at.asc())

    result = await db.execute(query)
    comments = result.scalars().all()

    # Enrich with user info
    comments_data = []
    for c in comments:
        data = c.to_dict()
        # Get user info
        user_result = await db.execute(select(User).where(User.id == c.user_id))
        user = user_result.scalar_one_or_none()
        data["user_name"] = user.full_name or user.email if user else "Unknown"
        data["user_email"] = user.email if user else ""
        comments_data.append(data)

    return {
        "proposal_id": proposal_id,
        "count": len(comments_data),
        "comments": comments_data,
    }


@router.get("/api/proposals/{proposal_id}/versions")
async def get_versions(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get version history for a proposal.

    Returns list of saved versions with timestamps and change summaries.
    """
    # Verify access
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    from collab_models.comment import ProposalVersion

    result = await db.execute(
        select(ProposalVersion)
        .where(ProposalVersion.proposal_id == proposal_id)
        .order_by(ProposalVersion.version_number.desc())
    )
    versions = result.scalars().all()

    # Always include current state as "latest"
    versions_data = [
        {
            "version": "current",
            "proposal_id": proposal_id,
            "title": proposal.title,
            "status": proposal.status,
            "sections_count": len(proposal.sections or {}),
            "updated_at": proposal.updated_at.isoformat() if proposal.updated_at else None,
        }
    ]

    for v in versions:
        data = v.to_dict()
        data["sections_count"] = len(v.sections_snapshot or {})
        # Get user info
        user_result = await db.execute(select(User).where(User.id == v.user_id))
        user = user_result.scalar_one_or_none()
        data["user_name"] = user.full_name or user.email if user else "Unknown"
        versions_data.append(data)

    return {
        "proposal_id": proposal_id,
        "count": len(versions_data),
        "versions": versions_data,
    }


@router.post("/api/proposals/{proposal_id}/versions")
async def save_version(
    proposal_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a version snapshot of the current proposal state.
    """
    # Verify access
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    body = await request.json()
    change_summary = body.get("change_summary", "Manual save")

    from collab_models.comment import ProposalVersion

    # Get next version number
    result = await db.execute(
        select(func.max(ProposalVersion.version_number))
        .where(ProposalVersion.proposal_id == proposal_id)
    )
    max_version = result.scalar() or 0

    version = ProposalVersion(
        proposal_id=proposal_id,
        user_id=current_user.id,
        version_number=max_version + 1,
        sections_snapshot=proposal.sections or {},
        change_summary=change_summary,
    )
    db.add(version)
    await db.flush()

    logger.info("Version %d saved for proposal %s", max_version + 1, proposal_id)

    return {
        "message": f"Version {max_version + 1} saved.",
        "version": version.to_dict(),
    }
