"""
Advanced Compliance Auto-Check endpoint.

POST /api/compliance/auto-check/{proposal_id} — Auto-check proposal compliance
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user
from services.compliance_checker import compliance_checker
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Compliance Auto-Check"])


@router.post("/api/compliance/auto-check/{proposal_id}")
async def auto_check_compliance(
    proposal_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Automatically check a proposal against compliance requirements.

    Analyzes:
    - FAR/DFARS references
    - Security compliance (CMMC, NIST, FedRAMP)
    - Quality assurance coverage
    - Small business subcontracting
    - Past performance documentation
    - Pricing structure
    - Technical approach completeness
    - Management plan

    Optional body:
    {
        "rfp_requirements": [
            {"text": "Contractor shall provide...", "category": "Technical", "priority": "Critical"}
        ]
    }
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

    # Parse optional RFP requirements from request body
    rfp_requirements = None
    try:
        body = await request.json()
        rfp_requirements = body.get("rfp_requirements")
    except Exception:
        pass  # No body or invalid JSON is fine

    proposal_data = proposal.to_dict()

    # Try AI service for enhanced analysis
    ai_service = None
    try:
        from services.ai_service import AIService
        ai_service = AIService()
    except Exception:
        pass

    # Run compliance check
    try:
        report = compliance_checker.auto_check(
            proposal=proposal_data,
            rfp_requirements=rfp_requirements,
            ai_service=ai_service,
        )
    except Exception as exc:
        logger.error("Compliance auto-check failed for %s: %s", proposal_id, exc)
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {exc}")

    # Notify user if compliance issues found
    if report["status"] == "non_compliant":
        notification_service.notify_compliance_alert(
            user_id=current_user.id,
            area="Proposal Compliance",
            message=f'Proposal "{proposal.title}" scored {report["overall_score"]}/100 on compliance check. Review recommended.',
        )

    logger.info(
        "Compliance auto-check for proposal %s: score=%d status=%s [user: %s]",
        proposal_id, report["overall_score"], report["status"], current_user.email,
    )

    return {
        "proposal_id": proposal_id,
        "proposal_title": proposal.title,
        **report,
    }
