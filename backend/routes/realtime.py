"""
Real-Time SSE Endpoints.

GET /api/realtime/events — SSE event stream for authenticated user
GET /api/realtime/status — Connection stats
"""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from db_models import User
from services.auth_service import get_current_user
from services.websocket_service import sse_broker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["Real-Time"])


@router.get("/events")
async def sse_event_stream(
    current_user: User = Depends(get_current_user),
):
    """
    Server-Sent Events stream for the authenticated user.

    Event types:
    - connected: initial connection confirmation
    - notification: new notification
    - proposal_update: proposal status change
    - alert_match: opportunity alert match found
    - scoring_complete: proposal scoring finished
    """
    return StreamingResponse(
        sse_broker.event_stream(current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/status")
async def realtime_status(
    current_user: User = Depends(get_current_user),
):
    """Get real-time connection statistics."""
    return sse_broker.get_stats()
