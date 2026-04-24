"""
Subscription & billing models for tiered plans.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SubscriptionPlan(Base):
    """Available subscription plans."""
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(100), nullable=False, unique=True)  # starter, professional, enterprise
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_monthly = Column(Float, nullable=False, default=0.0)
    price_yearly = Column(Float, nullable=False, default=0.0)
    max_proposals = Column(Integer, nullable=False, default=5)
    max_users = Column(Integer, nullable=False, default=1)
    max_storage_mb = Column(Integer, nullable=False, default=100)
    features = Column(JSON, nullable=False, default=list)  # list of feature strings
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "max_proposals": self.max_proposals,
            "max_users": self.max_users,
            "max_storage_mb": self.max_storage_mb,
            "features": self.features or [],
            "is_active": self.is_active,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UsageRecord(Base):
    """Track per-user usage for billing metering."""
    __tablename__ = "usage_records"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    metric = Column(String(100), nullable=False)  # proposals_generated, ai_calls, exports, storage_mb
    value = Column(Float, nullable=False, default=0)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "metric": self.metric,
            "value": self.value,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
