"""
SQLAlchemy ORM models for GovProposal AI.

Tables: User, VendorProfileDB, Proposal, Subscription
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
    full_name = Column(String(255), nullable=False, default="")
    company_name = Column(String(255), nullable=False, default="")
    is_admin = Column(Boolean, default=False, nullable=False)
    subscription_tier = Column(String(20), default="free", nullable=False)  # "free" | "paid"
    stripe_customer_id = Column(String(255), nullable=True)
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
            "full_name": self.full_name,
            "company_name": self.company_name,
            "is_admin": self.is_admin,
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
