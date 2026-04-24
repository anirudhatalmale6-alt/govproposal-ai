"""
Advanced AI Scoring API endpoints.

POST /api/scoring/comprehensive/{id} — Comprehensive multi-dimensional scoring
GET  /api/scoring/benchmarks          — Scoring benchmarks and context
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user
from services.advanced_scoring import advanced_scoring_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scoring", tags=["Advanced Scoring"])


@router.post("/comprehensive/{proposal_id}")
async def comprehensive_score(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run comprehensive multi-dimensional scoring on a proposal.

    Evaluates:
    - Technical Approach (30%)
    - Past Performance (20%)
    - Management Approach (15%)
    - Price Competitiveness (15%)
    - Compliance (10%)
    - Presentation Quality (10%)

    Returns overall score, grade, win probability, and per-dimension breakdown.
    """
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    # Try AI service
    ai_service = None
    try:
        from services.ai_service import AIService
        ai_service = AIService()
    except Exception:
        pass

    try:
        score_result = advanced_scoring_service.comprehensive_score(
            proposal.to_dict(),
            ai_service=ai_service,
        )
    except Exception as exc:
        logger.error("Comprehensive scoring failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")

    logger.info(
        "Comprehensive score: proposal=%s score=%.1f grade=%s user=%s",
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


@router.get("/benchmarks")
async def get_benchmarks(
    current_user: User = Depends(get_current_user),
):
    """Get scoring benchmarks for context (averages, thresholds, distributions)."""
    return advanced_scoring_service.get_benchmarks()
