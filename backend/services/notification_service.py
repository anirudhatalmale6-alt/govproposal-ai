"""
Notification Service for GovProposal AI.

Handles in-app notifications for:
- Proposal status changes
- Deadline reminders
- Team mentions and comments
- Compliance alerts
- System announcements

Uses an in-memory store with DB persistence for notifications.
Email sending is optional (falls back to in-app only).
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class Notification:
    """Single notification entry."""

    def __init__(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        link: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        self.id = f"notif_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        self.user_id = user_id
        self.title = title
        self.message = message
        self.type = notification_type  # info, success, warning, error, mention
        self.link = link
        self.metadata = metadata or {}
        self.is_read = False
        self.created_at = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "link": self.link,
            "metadata": self.metadata,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }


class NotificationService:
    """
    In-app notification system.

    Stores notifications per-user in memory. In production, persist to DB.
    """

    def __init__(self, max_per_user: int = 100):
        self._store: dict[str, list[Notification]] = defaultdict(list)
        self.max_per_user = max_per_user

    def notify(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        link: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Notification:
        """Create and store a notification for a user."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            metadata=metadata,
        )
        self._store[user_id].append(notif)

        # Trim old notifications if over limit
        if len(self._store[user_id]) > self.max_per_user:
            self._store[user_id] = self._store[user_id][-self.max_per_user:]

        logger.info("Notification sent to %s: %s", user_id, title)
        return notif

    def get_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
    ) -> list[dict]:
        """Get notifications for a user."""
        notifs = self._store.get(user_id, [])
        if unread_only:
            notifs = [n for n in notifs if not n.is_read]
        # Return newest first
        notifs = sorted(notifs, key=lambda n: n.created_at, reverse=True)
        return [n.to_dict() for n in notifs[:limit]]

    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications."""
        return sum(1 for n in self._store.get(user_id, []) if not n.is_read)

    def mark_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a specific notification as read."""
        for notif in self._store.get(user_id, []):
            if notif.id == notification_id:
                notif.is_read = True
                return True
        return False

    def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        count = 0
        for notif in self._store.get(user_id, []):
            if not notif.is_read:
                notif.is_read = True
                count += 1
        return count

    def delete_notification(self, user_id: str, notification_id: str) -> bool:
        """Delete a specific notification."""
        notifs = self._store.get(user_id, [])
        for i, notif in enumerate(notifs):
            if notif.id == notification_id:
                notifs.pop(i)
                return True
        return False

    # ── Convenience methods for common notification types ────

    def notify_proposal_status(self, user_id: str, proposal_title: str, new_status: str, proposal_id: str):
        """Notify about proposal status change."""
        status_icons = {
            "completed": "success",
            "draft": "info",
            "submitted": "success",
            "rejected": "error",
            "under_review": "warning",
        }
        return self.notify(
            user_id=user_id,
            title=f"Proposal Status: {new_status.replace('_', ' ').title()}",
            message=f'Proposal "{proposal_title}" status changed to {new_status}.',
            notification_type=status_icons.get(new_status, "info"),
            link=f"/proposals",
            metadata={"proposal_id": proposal_id, "status": new_status},
        )

    def notify_deadline_reminder(self, user_id: str, proposal_title: str, deadline: str, days_left: int):
        """Notify about upcoming deadline."""
        urgency = "error" if days_left <= 1 else "warning" if days_left <= 3 else "info"
        return self.notify(
            user_id=user_id,
            title=f"Deadline {'TODAY' if days_left <= 0 else f'in {days_left} days'}",
            message=f'Proposal "{proposal_title}" is due {deadline}.',
            notification_type=urgency,
            link="/proposals",
            metadata={"deadline": deadline, "days_left": days_left},
        )

    def notify_comment(self, user_id: str, commenter_name: str, proposal_title: str, proposal_id: str):
        """Notify about a new comment on a proposal."""
        return self.notify(
            user_id=user_id,
            title=f"New Comment from {commenter_name}",
            message=f'{commenter_name} commented on "{proposal_title}".',
            notification_type="mention",
            link=f"/proposals",
            metadata={"proposal_id": proposal_id, "commenter": commenter_name},
        )

    def notify_compliance_alert(self, user_id: str, area: str, message: str):
        """Notify about a compliance issue."""
        return self.notify(
            user_id=user_id,
            title=f"Compliance Alert: {area}",
            message=message,
            notification_type="warning",
            link="/compliance",
        )

    def notify_scoring_complete(self, user_id: str, proposal_title: str, score: int, proposal_id: str):
        """Notify that proposal scoring is complete."""
        return self.notify(
            user_id=user_id,
            title=f"Proposal Scored: {score}/100",
            message=f'"{proposal_title}" received a score of {score}/100.',
            notification_type="success" if score >= 70 else "warning",
            link=f"/proposals",
            metadata={"proposal_id": proposal_id, "score": score},
        )


# Singleton
notification_service = NotificationService()
