"""
Health check endpoints for GovProposal AI.

Provides comprehensive health monitoring:
- GET /api/health — Basic health status
- GET /api/health/detailed — Detailed service health (DB, AI, SAM.gov)
"""

import os
import time
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.cache_service import sam_cache, ai_cache, general_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["Health"])

_start_time = time.time()


@router.get("")
async def health_check():
    """
    Basic health check endpoint.
    Returns 200 if the application is running.
    """
    return {
        "status": "healthy",
        "service": "GovProposal AI",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """
    Detailed health check — verifies database connectivity and service status.
    """
    checks = {}
    overall = "healthy"

    # 1. Database check
    try:
        t0 = time.time()
        await db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - t0) * 1000, 1)
        checks["database"] = {
            "status": "healthy",
            "latency_ms": db_latency_ms,
        }
    except Exception as exc:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(exc),
        }
        overall = "degraded"

    # 2. AI service check (Gemini API key configured?)
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    checks["ai_service"] = {
        "status": "healthy" if gemini_key else "unconfigured",
        "provider": "Google Gemini",
        "api_key_set": bool(gemini_key),
    }
    if not gemini_key:
        overall = "degraded"

    # 3. SAM.gov API key check
    sam_key = os.getenv("SAM_API_KEY", "")
    checks["sam_gov"] = {
        "status": "healthy" if sam_key else "unconfigured",
        "api_key_set": bool(sam_key),
    }

    # 4. Cache status
    checks["cache"] = {
        "sam_cache": sam_cache.stats(),
        "ai_cache": ai_cache.stats(),
        "general_cache": general_cache.stats(),
    }

    # 5. Uptime
    uptime_seconds = int(time.time() - _start_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    return {
        "status": overall,
        "service": "GovProposal AI",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": f"{hours}h {minutes}m {seconds}s",
        "uptime_seconds": uptime_seconds,
        "checks": checks,
    }
