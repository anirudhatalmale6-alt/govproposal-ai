"""
SQLAlchemy ORM models for GovProposal AI.

Tables: User, VendorProfileDB, Proposal, Subscription, SearchSource,
       ProposalTemplate, FavoriteTemplate
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from database import Base


def _uuid() -> str:
    """Generate a new UUID string for primary keys."""
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────────────────────────
# User
# ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=False, default="")
    last_name = Column(String(255), nullable=False, default="")
    full_name = Column(String(255), nullable=False, default="")
    company_name = Column(String(255), nullable=False, default="")
    mobile_number = Column(String(50), nullable=True)
    landline_number = Column(String(50), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    subscription_tier = Column(String(20), default="free", nullable=False)  # "free" | "paid"
    stripe_customer_id = Column(String(255), nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    vendor_profiles = relationship("VendorProfileDB", back_populates="user", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Return a safe dict (no password hash)."""
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "company_name": self.company_name,
            "mobile_number": self.mobile_number,
            "landline_number": self.landline_number,
            "is_admin": self.is_admin,
            "email_verified": self.email_verified,
            "subscription_tier": self.subscription_tier,
            "stripe_customer_id": self.stripe_customer_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────────────────────────
# VendorProfile (DB-backed, replaces JSON files)
# ──────────────────────────────────────────────

class VendorProfileDB(Base):
    __tablename__ = "vendor_profiles"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, default="")
    cage_code = Column(String(50), nullable=False, default="")
    duns_number = Column(String(50), nullable=False, default="")
    naics_codes = Column(JSON, nullable=False, default=list)
    capabilities = Column(Text, nullable=False, default="")
    past_performance = Column(Text, nullable=False, default="")
    socioeconomic_status = Column(String(500), nullable=False, default="")
    contact_info = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="vendor_profiles")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_name": self.company_name,
            "cage_code": self.cage_code,
            "duns_number": self.duns_number,
            "naics_codes": self.naics_codes or [],
            "capabilities": self.capabilities,
            "past_performance": self.past_performance,
            "socioeconomic_status": self.socioeconomic_status,
            "contact_info": self.contact_info or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────────────────────────
# Proposal
# ──────────────────────────────────────────────

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False, default="")
    opportunity_title = Column(String(500), nullable=False, default="")
    opportunity_agency = Column(String(500), nullable=False, default="")
    opportunity_description = Column(Text, nullable=False, default="")
    sections = Column(JSON, nullable=False, default=dict)  # Full proposal content
    status = Column(String(20), nullable=False, default="draft")  # "draft" | "completed"
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="proposals")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "opportunity_title": self.opportunity_title,
            "opportunity_agency": self.opportunity_agency,
            "opportunity_description": self.opportunity_description,
            "sections": self.sections or {},
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ──────────────────────────────────────────────
# Subscription
# ──────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    plan = Column(String(20), nullable=False, default="free")  # "free" | "paid"
    price_cents = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")  # "active" | "cancelled" | "past_due"
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="subscriptions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "plan": self.plan,
            "price_cents": self.price_cents,
            "status": self.status,
            "current_period_start": self.current_period_start.isoformat() if self.current_period_start else None,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────────────────────────
# SearchSource (master list of opportunity websites)
# ──────────────────────────────────────────────

class SearchSource(Base):
    __tablename__ = "search_sources"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)  # e.g. "SAM.gov", "Grants.gov"
    url = Column(String(500), nullable=False)  # Base URL of the website
    description = Column(Text, nullable=False, default="")
    is_default = Column(Boolean, default=False, nullable=False)  # SAM.gov = True, user-added = False
    is_active = Column(Boolean, default=True, nullable=False)
    added_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    added_by_user = relationship("User", foreign_keys=[added_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "is_default": self.is_default,
            "is_active": self.is_active,
            "added_by": self.added_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────────────────────────
# ProposalTemplate (pre-built sample templates organized by industry)
# ──────────────────────────────────────────────

class ProposalTemplate(Base):
    __tablename__ = "proposal_templates"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False, default="")
    category = Column(String(100), nullable=False)  # e.g. "IT & Technology", "Healthcare"
    thumbnail_color = Column(String(7), nullable=False, default="#1e3a5f")  # hex color for card UI
    sections = Column(JSON, nullable=False, default=dict)  # Pre-filled proposal sections content
    vendor_defaults = Column(JSON, nullable=False, default=dict)  # Default vendor info for this template
    opportunity_defaults = Column(JSON, nullable=False, default=dict)  # Default opportunity info
    is_free = Column(Boolean, default=True, nullable=False)
    use_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "thumbnail_color": self.thumbnail_color,
            "sections": self.sections or {},
            "vendor_defaults": self.vendor_defaults or {},
            "opportunity_defaults": self.opportunity_defaults or {},
            "is_free": self.is_free,
            "use_count": self.use_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────────────────────────
# FavoriteTemplate (user's saved favorite templates)
# ──────────────────────────────────────────────

class FavoriteTemplate(Base):
    __tablename__ = "favorite_templates"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("proposal_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    template = relationship("ProposalTemplate", foreign_keys=[template_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "template_id": self.template_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ──────────────────────────────────────────────
# ProposalShare (shareable draft links)
# ──────────────────────────────────────────────

class ProposalShare(Base):
    __tablename__ = "proposal_shares"

    id = Column(String(36), primary_key=True, default=_uuid)
    proposal_id = Column(String(36), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    share_token = Column(String(36), unique=True, nullable=False, default=_uuid, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    proposal = relationship("Proposal", foreign_keys=[proposal_id])
    creator = relationship("User", foreign_keys=[created_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "proposal_id": self.proposal_id,
            "share_token": self.share_token,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": self.is_active,
        }


# ──────────────────────────────────────────────
# AuditLog (user activity tracking)
# ──────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    proposal_id = Column(String(36), ForeignKey("proposals.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g. "created_proposal", "exported_pdf", "shared_proposal", "login"
    details = Column(Text, nullable=True)  # JSON string with extra info
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    proposal = relationship("Proposal", foreign_keys=[proposal_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "proposal_id": self.proposal_id,
            "action": self.action,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
