"""
Rate limiting middleware for GovProposal AI.

Uses a simple in-memory token bucket algorithm.
Different rate limits for AI endpoints vs general API endpoints.

Limits:
- AI endpoints (/api/generate-proposal, /api/proposals/generate-section, etc.): 10 req/min
- General endpoints: 60 req/min
"""

import time
import logging
from collections import defaultdict
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# AI-intensive endpoints that need stricter rate limiting
AI_ENDPOINTS = {
    "/api/generate-proposal",
    "/api/proposals/generate-section",
    "/api/rfp/deconstruct",
    "/api/compliance/analyze",
    "/api/opportunities/review",
    "/api/market-research/pricing-recommendation",
    "/api/proposals/{id}/score",
    "/api/compliance/auto-check",
}

# Endpoints exempt from rate limiting
EXEMPT_ENDPOINTS = {
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class TokenBucket:
    """Token bucket rate limiter for a single client."""

    __slots__ = ("capacity", "tokens", "refill_rate", "last_refill")

    def __init__(self, capacity: int, refill_rate: float):
        """
        Args:
            capacity: Max tokens in bucket
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = refill_rate
        self.last_refill = time.monotonic()

    def consume(self) -> bool:
        """Try to consume one token. Returns True if allowed, False if rate-limited."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False

    @property
    def remaining(self) -> int:
        """Approximate tokens remaining."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        return int(min(self.capacity, self.tokens + elapsed * self.refill_rate))

    @property
    def retry_after(self) -> float:
        """Seconds until next token is available."""
        if self.tokens >= 1.0:
            return 0
        return (1.0 - self.tokens) / self.refill_rate


class RateLimitStore:
    """Manages token buckets for all clients."""

    def __init__(self):
        self._ai_buckets: dict[str, TokenBucket] = {}
        self._general_buckets: dict[str, TokenBucket] = {}
        self._last_cleanup = time.monotonic()

    def get_bucket(self, client_id: str, is_ai: bool) -> TokenBucket:
        """Get or create a token bucket for a client."""
        store = self._ai_buckets if is_ai else self._general_buckets
        if client_id not in store:
            if is_ai:
                # 10 requests per minute = 10 capacity, ~0.167 tokens/sec
                store[client_id] = TokenBucket(capacity=10, refill_rate=10 / 60)
            else:
                # 60 requests per minute = 60 capacity, 1 token/sec
                store[client_id] = TokenBucket(capacity=60, refill_rate=60 / 60)

        # Periodic cleanup of stale buckets (every 5 min)
        if time.monotonic() - self._last_cleanup > 300:
            self._cleanup()

        return store[client_id]

    def _cleanup(self):
        """Remove buckets that haven't been used recently."""
        now = time.monotonic()
        for store in (self._ai_buckets, self._general_buckets):
            stale = [
                k for k, v in store.items()
                if now - v.last_refill > 600  # inactive for 10 min
            ]
            for k in stale:
                del store[k]
        self._last_cleanup = now


# Singleton store
_rate_limit_store = RateLimitStore()


def _get_client_id(request: Request) -> str:
    """Extract a client identifier from the request."""
    # Use Authorization token if present (identifies the user)
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # Use last 16 chars of token as identifier (enough uniqueness, not storing full token)
        return f"token:{token[-16:]}"
    # Fall back to IP address
    client = request.client
    return f"ip:{client.host}" if client else "ip:unknown"


def _is_ai_endpoint(path: str) -> bool:
    """Check if the path matches an AI-intensive endpoint."""
    for ep in AI_ENDPOINTS:
        if "{id}" in ep:
            # Pattern match: /api/proposals/xxx/score
            parts = ep.split("{id}")
            if path.startswith(parts[0]) and (len(parts) < 2 or path.endswith(parts[1])):
                return True
        elif path == ep or path.startswith(ep + "/"):
            return True
    return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that applies token bucket rate limiting."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip rate limiting for exempt endpoints and static files
        if path in EXEMPT_ENDPOINTS or path.startswith("/assets") or not path.startswith("/api"):
            return await call_next(request)

        client_id = _get_client_id(request)
        is_ai = _is_ai_endpoint(path)
        bucket = _rate_limit_store.get_bucket(client_id, is_ai)

        if not bucket.consume():
            retry_after = int(bucket.retry_after) + 1
            limit_type = "AI" if is_ai else "general"
            logger.warning(
                "Rate limit exceeded: client=%s path=%s type=%s retry_after=%ds",
                client_id, path, limit_type, retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": retry_after,
                    "limit_type": limit_type,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(bucket.capacity),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)

        # Add rate limit headers to all API responses
        response.headers["X-RateLimit-Limit"] = str(bucket.capacity)
        response.headers["X-RateLimit-Remaining"] = str(bucket.remaining)

        return response
