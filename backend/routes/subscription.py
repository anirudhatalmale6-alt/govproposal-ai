"""
Subscription & Billing API endpoints.

GET  /api/subscription          — Get current subscription info
GET  /api/subscription/plans    — List available plans
PUT  /api/subscription/upgrade  — Upgrade/downgrade plan
GET  /api/subscription/usage    — Get usage metrics
"""

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscription", tags=["Subscription & Billing"])

# Static plan definitions
PLANS = [
    {
        "id": "starter",
        "name": "Starter",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_proposals": 5,
        "max_users": 1,
        "max_storage_mb": 100,
        "features": [
            "Up to 5 proposals/month",
            "SAM.gov search",
            "Basic AI generation",
            "PDF/DOCX export",
        ],
    },
    {
        "id": "professional",
        "name": "Professional",
        "price_monthly": 49,
        "price_yearly": 470,
        "max_proposals": 50,
        "max_users": 5,
        "max_storage_mb": 1000,
        "features": [
            "Up to 50 proposals/month",
            "All search sources",
            "Advanced AI scoring",
            "Team collaboration",
            "Compliance auto-check",
            "Priority support",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_monthly": 149,
        "price_yearly": 1430,
        "max_proposals": -1,  # unlimited
        "max_users": -1,
        "max_storage_mb": 10000,
        "features": [
            "Unlimited proposals",
            "Unlimited team members",
            "White-label branding",
            "Multi-organization",
            "Advanced analytics",
            "Custom integrations",
            "Dedicated support",
            "SLA guarantee",
        ],
    },
]


@router.get("")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's current subscription details."""
    tier = current_user.subscription_tier or "free"
    plan_id = "starter" if tier == "free" else ("enterprise" if tier == "enterprise" else "professional")

    plan = next((p for p in PLANS if p["id"] == plan_id), PLANS[0])

    # Count proposals this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Proposal.id)).where(
            Proposal.user_id == current_user.id,
            Proposal.created_at >= month_start,
        )
    )
    proposals_this_month = result.scalar() or 0

    return {
        "plan": plan,
        "tier": tier,
        "proposals_this_month": proposals_this_month,
        "billing_period": {
            "start": month_start.isoformat(),
            "end": (month_start + timedelta(days=32)).replace(day=1).isoformat(),
        },
    }


@router.get("/plans")
async def list_plans():
    """List all available subscription plans."""
    return {"plans": PLANS}


@router.put("/upgrade")
async def upgrade_plan(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade or downgrade subscription plan.

    Body: { "plan_id": "professional" }

    Note: In production, this would integrate with Stripe/payment gateway.
    For now, it directly updates the user's tier.
    """
    body = await request.json()
    plan_id = body.get("plan_id", "").strip()

    valid_plans = {p["id"] for p in PLANS}
    if plan_id not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Choose from: {', '.join(valid_plans)}")

    # Map plan_id to subscription_tier
    tier_map = {"starter": "free", "professional": "paid", "enterprise": "enterprise"}
    new_tier = tier_map.get(plan_id, "free")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_tier = user.subscription_tier
    user.subscription_tier = new_tier
    db.add(user)
    await db.flush()

    logger.info("Subscription changed: user=%s from=%s to=%s", current_user.email, old_tier, new_tier)

    return {
        "message": f"Subscription updated to {plan_id}.",
        "old_tier": old_tier,
        "new_tier": new_tier,
        "plan": next((p for p in PLANS if p["id"] == plan_id), None),
    }


@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current usage metrics for the billing period."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Proposals this month
    result = await db.execute(
        select(func.count(Proposal.id)).where(
            Proposal.user_id == current_user.id,
            Proposal.created_at >= month_start,
        )
    )
    proposals_count = result.scalar() or 0

    # Total proposals
    result = await db.execute(
        select(func.count(Proposal.id)).where(Proposal.user_id == current_user.id)
    )
    total_proposals = result.scalar() or 0

    # Get plan limits
    tier = current_user.subscription_tier or "free"
    plan_id = "starter" if tier == "free" else ("enterprise" if tier == "enterprise" else "professional")
    plan = next((p for p in PLANS if p["id"] == plan_id), PLANS[0])

    max_proposals = plan["max_proposals"]
    usage_percent = (proposals_count / max_proposals * 100) if max_proposals > 0 else 0

    return {
        "period": {
            "start": month_start.isoformat(),
            "end": (month_start + timedelta(days=32)).replace(day=1).isoformat(),
        },
        "usage": {
            "proposals_this_month": proposals_count,
            "proposals_total": total_proposals,
            "max_proposals": max_proposals,
            "usage_percent": round(usage_percent, 1),
        },
        "plan": plan,
    }
