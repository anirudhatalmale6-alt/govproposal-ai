"""
Notification API endpoints.

GET  /api/notifications — Get user notifications
PUT  /api/notifications/{id}/read — Mark a notification as read
PUT  /api/notifications/read-all — Mark all as read
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from db_models import User
from services.auth_service import get_current_user
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
async def get_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for the current user."""
    notifications = notification_service.get_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    unread_count = notification_service.get_unread_count(current_user.id)

    return {
        "count": len(notifications),
        "unread_count": unread_count,
        "notifications": notifications,
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    success = notification_service.mark_read(current_user.id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"message": "Notification marked as read."}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    count = notification_service.mark_all_read(current_user.id)
    return {"message": f"{count} notifications marked as read.", "count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a specific notification."""
    success = notification_service.delete_notification(current_user.id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"message": "Notification deleted."}
