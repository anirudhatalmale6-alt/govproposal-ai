"""
Proposal Scoring API endpoints.

POST /api/proposals/{id}/score — Score a proposal 0-100
GET  /api/proposals/{id}/feedback — Get detailed feedback for a scored proposal
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user
from services.scoring_service import scoring_service
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Proposal Scoring"])


# In-memory store for score results (keyed by proposal_id)
_score_cache: dict[str, dict] = {}


@router.post("/api/proposals/{proposal_id}/score")
async def score_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI-score a proposal on a 0-100 scale.

    Evaluates:
    - Compliance (30%): FAR/DFARS references, security, regulatory
    - Completeness (25%): All required sections present
    - Clarity (20%): Writing quality, structure, organization
    - Section Quality (25%): Depth and detail of each section

    Returns overall score, letter grade, category breakdown, and recommendations.
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

    proposal_data = proposal.to_dict()

    # Try to use AI service for enhanced feedback
    ai_service = None
    try:
        from services.ai_service import AIService
        ai_service = AIService()
    except Exception:
        pass

    # Score the proposal
    try:
        score_result = scoring_service.score_proposal(proposal_data, ai_service=ai_service)
    except Exception as exc:
        logger.error("Scoring failed for proposal %s: %s", proposal_id, exc)
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")

    # Cache the score
    _score_cache[proposal_id] = score_result

    # Send notification
    notification_service.notify_scoring_complete(
        user_id=current_user.id,
        proposal_title=proposal.title,
        score=score_result["overall_score"],
        proposal_id=proposal_id,
    )

    logger.info(
        "Proposal scored: %s — %d/100 (%s) [user: %s]",
        proposal_id,
        score_result["overall_score"],
        score_result["grade"],
        current_user.email,
    )

    return {
        "proposal_id": proposal_id,
        "proposal_title": proposal.title,
        **score_result,
    }


@router.get("/api/proposals/{proposal_id}/feedback")
async def get_proposal_feedback(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed AI feedback for a scored proposal.

    Must score the proposal first via POST /api/proposals/{id}/score.
    Returns per-section feedback, improvement priorities, and AI-generated suggestions.
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

    # Get cached score
    score_data = _score_cache.get(proposal_id)
    if not score_data:
        raise HTTPException(
            status_code=400,
            detail="Proposal has not been scored yet. Use POST /api/proposals/{id}/score first.",
        )

    proposal_data = proposal.to_dict()

    # Try AI service
    ai_service = None
    try:
        from services.ai_service import AIService
        ai_service = AIService()
    except Exception:
        pass

    feedback = scoring_service.get_feedback(proposal_data, score_data, ai_service=ai_service)

    return {
        "proposal_id": proposal_id,
        "proposal_title": proposal.title,
        **feedback,
    }
