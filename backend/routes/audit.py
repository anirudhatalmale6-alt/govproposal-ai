"""
Audit & Export API endpoints.

GET /api/audit/log     — Full audit trail with filters
GET /api/audit/export  — Export proposals and analytics as CSV
"""

import csv
import io
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User, Proposal, AuditLog
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["Audit & Export"])


@router.get("/log")
async def get_audit_log(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: str = Query(None, description="Filter by action type"),
    date_from: str = Query(None, description="Filter from date (ISO format)"),
    date_to: str = Query(None, description="Filter to date (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get full audit trail for the current user with filtering.

    Supports filtering by action type and date range.
    """
    stmt = select(AuditLog).where(AuditLog.user_id == current_user.id)

    if action:
        stmt = stmt.where(AuditLog.action == action)

    if date_from:
        try:
            dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            stmt = stmt.where(AuditLog.created_at >= dt)
        except ValueError:
            pass

    if date_to:
        try:
            dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            stmt = stmt.where(AuditLog.created_at <= dt)
        except ValueError:
            pass

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Paginated results
    stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    # Get unique action types for filter dropdown
    action_result = await db.execute(
        select(AuditLog.action).where(AuditLog.user_id == current_user.id).distinct()
    )
    action_types = sorted([row[0] for row in action_result.all()])

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "action_types": action_types,
        "entries": [e.to_dict() for e in entries],
    }


@router.get("/export")
async def export_data(
    format: str = Query("csv", description="Export format: csv or json"),
    data_type: str = Query("proposals", description="Data type: proposals, audit, or all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export proposals and/or audit data as CSV or JSON.

    Parameters:
    - format: csv or json
    - data_type: proposals, audit, or all
    """
    if format not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Format must be csv or json.")

    export_data = {}

    # Export proposals
    if data_type in ("proposals", "all"):
        result = await db.execute(
            select(Proposal)
            .where(Proposal.user_id == current_user.id)
            .order_by(desc(Proposal.created_at))
        )
        proposals = result.scalars().all()
        export_data["proposals"] = [
            {
                "id": p.id,
                "title": p.title,
                "opportunity_title": p.opportunity_title,
                "opportunity_agency": p.opportunity_agency,
                "status": p.status,
                "sections_count": len(p.sections or {}),
                "created_at": p.created_at.isoformat() if p.created_at else "",
                "updated_at": p.updated_at.isoformat() if p.updated_at else "",
            }
            for p in proposals
        ]

    # Export audit log
    if data_type in ("audit", "all"):
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == current_user.id)
            .order_by(desc(AuditLog.created_at))
            .limit(1000)
        )
        entries = result.scalars().all()
        export_data["audit_log"] = [e.to_dict() for e in entries]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if format == "json":
        content = json.dumps(export_data, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="govproposal_export_{timestamp}.json"'},
        )

    # CSV export
    output = io.StringIO()

    if "proposals" in export_data and export_data["proposals"]:
        writer = csv.DictWriter(output, fieldnames=export_data["proposals"][0].keys())
        output.write("--- PROPOSALS ---\n")
        writer.writeheader()
        writer.writerows(export_data["proposals"])
        output.write("\n")

    if "audit_log" in export_data and export_data["audit_log"]:
        output.write("--- AUDIT LOG ---\n")
        writer = csv.DictWriter(output, fieldnames=export_data["audit_log"][0].keys())
        writer.writeheader()
        writer.writerows(export_data["audit_log"])

    csv_bytes = output.getvalue().encode()
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="govproposal_export_{timestamp}.csv"'},
    )
