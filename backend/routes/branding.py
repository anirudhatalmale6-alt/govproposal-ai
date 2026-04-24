"""
White-Label Branding API endpoints.

GET /api/branding      — Get current branding settings
PUT /api/branding      — Update branding (logo, colors, name)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from db_models import User
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/branding", tags=["Branding"])

# In-memory branding store: user_id -> branding dict
_branding_store: dict[str, dict] = {}

DEFAULT_BRANDING = {
    "app_name": "GovProposal AI",
    "logo_url": "",
    "favicon_url": "",
    "primary_color": "#0d9488",
    "secondary_color": "#1e3a5f",
    "accent_color": "#f59e0b",
    "header_bg": "#1e3a5f",
    "header_text": "#ffffff",
    "sidebar_bg": "#ffffff",
    "sidebar_text": "#374151",
    "button_bg": "#0d9488",
    "button_text": "#ffffff",
    "font_family": "Inter, system-ui, sans-serif",
    "border_radius": "0.5rem",
    "company_name": "",
    "company_tagline": "",
    "footer_text": "",
    "custom_css": "",
}


@router.get("")
async def get_branding(
    current_user: User = Depends(get_current_user),
):
    """Get the user's white-label branding settings."""
    branding = _branding_store.get(current_user.id, DEFAULT_BRANDING.copy())
    return {"branding": branding}


@router.put("")
async def update_branding(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Update branding settings.

    Body: Any subset of branding fields:
    {
        "app_name": "My Proposal Tool",
        "primary_color": "#3b82f6",
        "logo_url": "https://example.com/logo.png",
        ...
    }
    """
    body = await request.json()

    # Start from existing or default
    current = _branding_store.get(current_user.id, DEFAULT_BRANDING.copy())

    # Update only known fields
    for key in DEFAULT_BRANDING:
        if key in body:
            current[key] = body[key]

    _branding_store[current_user.id] = current

    logger.info("Branding updated for user %s", current_user.email)

    return {"message": "Branding updated.", "branding": current}
