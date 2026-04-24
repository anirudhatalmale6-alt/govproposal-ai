"""
Advanced Analytics API endpoints.

GET /api/analytics/win-rate — Win/loss rate analytics
GET /api/analytics/pipeline-value — Pipeline value and forecast
GET /api/analytics/response-time — Proposal response time metrics
GET /api/analytics/team-performance — Team collaboration metrics
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal, Contract, AuditLog
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Advanced Analytics"])


@router.get("/win-rate")
async def win_rate_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Win/loss rate analytics for proposals.

    Returns:
    - Total proposals
    - Status breakdown (draft, completed, submitted, won, lost)
    - Win rate percentage
    - Monthly trend data
    """
    result = await db.execute(
        select(Proposal).where(Proposal.user_id == current_user.id)
    )
    proposals = result.scalars().all()

    # Status counts
    status_counts = Counter()
    monthly_data = {}
    for p in proposals:
        status_counts[p.status] += 1
        # Monthly aggregation
        if p.created_at:
            month_key = p.created_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"created": 0, "completed": 0}
            monthly_data[month_key]["created"] += 1
            if p.status == "completed":
                monthly_data[month_key]["completed"] += 1

    total = len(proposals)
    completed = status_counts.get("completed", 0)
    won = status_counts.get("won", 0)
    lost = status_counts.get("lost", 0)
    submitted = status_counts.get("submitted", 0)

    # Win rate: won / (won + lost) if any outcomes
    decisions = won + lost
    win_rate = round(won / decisions * 100, 1) if decisions > 0 else 0
    # Completion rate: completed / total
    completion_rate = round(completed / total * 100, 1) if total > 0 else 0

    # Sort monthly data
    sorted_months = sorted(monthly_data.keys())[-12:]  # Last 12 months
    trend = [
        {"month": m, **monthly_data[m]}
        for m in sorted_months
    ]

    return {
        "total_proposals": total,
        "status_breakdown": dict(status_counts),
        "win_rate": win_rate,
        "completion_rate": completion_rate,
        "decisions": {"won": won, "lost": lost, "pending": submitted},
        "monthly_trend": trend,
    }


@router.get("/pipeline-value")
async def pipeline_value_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pipeline value and forecast analytics.

    Returns:
    - Total pipeline value (from contracts)
    - Active contract value
    - Value by status
    - Forecast based on proposal pipeline
    """
    # Get contracts
    result = await db.execute(
        select(Contract).where(Contract.user_id == current_user.id)
    )
    contracts = result.scalars().all()

    total_value = sum(c.value or 0 for c in contracts)
    active_value = sum(c.value or 0 for c in contracts if c.status == "active")
    completed_value = sum(c.value or 0 for c in contracts if c.status in ("completed", "closed"))

    # Value by status
    value_by_status = {}
    for c in contracts:
        status = c.status or "unknown"
        value_by_status[status] = value_by_status.get(status, 0) + (c.value or 0)

    # Value by agency
    value_by_agency = {}
    for c in contracts:
        agency = c.agency or "Unknown"
        value_by_agency[agency] = value_by_agency.get(agency, 0) + (c.value or 0)
    # Sort by value, top 10
    top_agencies = sorted(value_by_agency.items(), key=lambda x: x[1], reverse=True)[:10]

    # Get proposals for pipeline forecast
    result = await db.execute(
        select(Proposal).where(
            Proposal.user_id == current_user.id,
            Proposal.status.in_(["draft", "completed"]),
        )
    )
    proposals = result.scalars().all()

    # Estimate pipeline (proposals not yet awarded)
    pipeline_count = len(proposals)

    return {
        "total_contract_value": total_value,
        "active_value": active_value,
        "completed_value": completed_value,
        "total_contracts": len(contracts),
        "value_by_status": value_by_status,
        "top_agencies": [{"agency": a, "value": v} for a, v in top_agencies],
        "pipeline": {
            "proposals_in_progress": pipeline_count,
            "estimated_pipeline_value": "N/A",  # Would need estimated values on proposals
        },
    }


@router.get("/response-time")
async def response_time_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Proposal response time metrics.

    Returns:
    - Average time from creation to completion
    - Average time per proposal
    - Fastest and slowest proposals
    """
    result = await db.execute(
        select(Proposal)
        .where(Proposal.user_id == current_user.id)
        .order_by(Proposal.created_at.desc())
    )
    proposals = result.scalars().all()

    response_times = []
    for p in proposals:
        if p.created_at and p.updated_at and p.status == "completed":
            delta = p.updated_at - p.created_at
            hours = delta.total_seconds() / 3600
            response_times.append({
                "proposal_id": p.id,
                "title": p.title[:80],
                "hours": round(hours, 1),
                "created": p.created_at.isoformat(),
                "completed": p.updated_at.isoformat(),
            })

    if response_times:
        avg_hours = round(sum(r["hours"] for r in response_times) / len(response_times), 1)
        fastest = min(response_times, key=lambda r: r["hours"])
        slowest = max(response_times, key=lambda r: r["hours"])
    else:
        avg_hours = 0
        fastest = None
        slowest = None

    # Recent activity (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent = [p for p in proposals if p.created_at and p.created_at >= thirty_days_ago]

    return {
        "total_completed": len(response_times),
        "average_hours": avg_hours,
        "fastest": fastest,
        "slowest": slowest,
        "recent_30_days": {
            "proposals_created": len(recent),
            "completed": sum(1 for p in recent if p.status == "completed"),
        },
        "all_response_times": response_times[:20],  # Last 20
    }


@router.get("/team-performance")
async def team_performance_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Team collaboration and performance metrics.

    Returns:
    - User activity summary
    - Proposal creation rate
    - Export activity
    - Audit log summary
    """
    # Get audit log entries
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
    )
    entries = result.scalars().all()

    # Action breakdown
    action_counts = Counter()
    daily_activity = {}
    for e in entries:
        action_counts[e.action] += 1
        if e.created_at:
            day_key = e.created_at.strftime("%Y-%m-%d")
            daily_activity[day_key] = daily_activity.get(day_key, 0) + 1

    # Count proposals
    result = await db.execute(
        select(func.count(Proposal.id)).where(Proposal.user_id == current_user.id)
    )
    total_proposals = result.scalar() or 0

    # Count contracts
    result = await db.execute(
        select(func.count(Contract.id)).where(Contract.user_id == current_user.id)
    )
    total_contracts = result.scalar() or 0

    # Get comment count
    try:
        from collab_models.comment import Comment
        result = await db.execute(
            select(func.count(Comment.id)).where(Comment.user_id == current_user.id)
        )
        total_comments = result.scalar() or 0
    except Exception:
        total_comments = 0

    # Activity trend (last 14 days)
    today = datetime.now(timezone.utc).date()
    trend = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.isoformat()
        trend.append({
            "date": day_str,
            "actions": daily_activity.get(day_str, 0),
        })

    return {
        "user": {
            "name": current_user.full_name or current_user.email,
            "email": current_user.email,
            "member_since": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "totals": {
            "proposals": total_proposals,
            "contracts": total_contracts,
            "comments": total_comments,
            "audit_actions": len(entries),
        },
        "action_breakdown": dict(action_counts.most_common(10)),
        "activity_trend": trend,
    }
