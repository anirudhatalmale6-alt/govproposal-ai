"""
Real-Time Notification Service using Server-Sent Events (SSE).

Provides an in-memory event bus that backend code can publish to,
and an SSE endpoint streams events to connected frontend clients.
"""

import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


class SSEBroker:
    """
    In-memory pub/sub broker for Server-Sent Events.

    Each connected client gets an asyncio.Queue keyed by user_id.
    When an event is published for a user, it is pushed to all their queues.
    """

    def __init__(self):
        # user_id -> list of asyncio.Queue
        self._subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._stats = {"total_events": 0, "peak_connections": 0}

    def subscribe(self, user_id: str) -> asyncio.Queue:
        """Register a new subscriber for a user. Returns a queue to await events on."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        self._subscribers[user_id].append(queue)
        active = sum(len(qs) for qs in self._subscribers.values())
        if active > self._stats["peak_connections"]:
            self._stats["peak_connections"] = active
        logger.info("SSE subscribe: user=%s (active queues: %d)", user_id, active)
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue):
        """Remove a subscriber queue."""
        if user_id in self._subscribers:
            try:
                self._subscribers[user_id].remove(queue)
            except ValueError:
                pass
            if not self._subscribers[user_id]:
                del self._subscribers[user_id]
        logger.info("SSE unsubscribe: user=%s", user_id)

    async def publish(self, user_id: str, event_type: str, data: dict):
        """Push an event to all queues for a given user."""
        event = {
            "id": str(uuid.uuid4()),
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._stats["total_events"] += 1

        queues = self._subscribers.get(user_id, [])
        for q in queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Drop oldest event if queue is full
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except Exception:
                    pass
        logger.debug("SSE publish: user=%s type=%s queues=%d", user_id, event_type, len(queues))

    async def broadcast(self, event_type: str, data: dict):
        """Push an event to ALL connected users."""
        for user_id in list(self._subscribers.keys()):
            await self.publish(user_id, event_type, data)

    async def event_stream(self, user_id: str) -> AsyncGenerator[str, None]:
        """
        Async generator that yields SSE-formatted strings.
        Used by the FastAPI StreamingResponse.
        """
        queue = self.subscribe(user_id)
        try:
            # Send initial connection event
            yield _format_sse("connected", {"message": "Real-time connection established"})

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield _format_sse(event["type"], event["data"], event_id=event["id"])
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self.unsubscribe(user_id, queue)

    def get_stats(self) -> dict:
        active = sum(len(qs) for qs in self._subscribers.values())
        return {
            "active_connections": active,
            "connected_users": len(self._subscribers),
            "total_events_published": self._stats["total_events"],
            "peak_connections": self._stats["peak_connections"],
        }


def _format_sse(event_type: str, data: dict, event_id: str | None = None) -> str:
    """Format a dict as an SSE message string."""
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event_type}")
    lines.append(f"data: {json.dumps(data)}")
    lines.append("")
    lines.append("")
    return "\n".join(lines)


# Global singleton
sse_broker = SSEBroker()
