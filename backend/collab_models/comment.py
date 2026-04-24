"""
Comment and ProposalVersion models for team collaboration.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Comment(Base):
    """Team comments on proposals."""
    __tablename__ = "proposal_comments"

    id = Column(String(36), primary_key=True, default=_uuid)
    proposal_id = Column(String(36), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    section_key = Column(String(100), nullable=True)  # Optional: which section this comment is about
    parent_id = Column(String(36), ForeignKey("proposal_comments.id", ondelete="SET NULL"), nullable=True)  # For threaded replies
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    proposal = relationship("Proposal", foreign_keys=[proposal_id])
    replies = relationship("Comment", foreign_keys=[parent_id], lazy="select")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "proposal_id": self.proposal_id,
            "user_id": self.user_id,
            "content": self.content,
            "section_key": self.section_key,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ProposalVersion(Base):
    """Version history for proposal edits."""
    __tablename__ = "proposal_versions"

    id = Column(String(36), primary_key=True, default=_uuid)
    proposal_id = Column(String(36), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    sections_snapshot = Column(JSON, nullable=False, default=dict)  # Full snapshot of sections at this version
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    proposal = relationship("Proposal", foreign_keys=[proposal_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "proposal_id": self.proposal_id,
            "user_id": self.user_id,
            "version_number": self.version_number,
            "change_summary": self.change_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
