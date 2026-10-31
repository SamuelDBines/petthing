from __future__ import annotations

import enum
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class QueueStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    published = "published"
    rejected = "rejected"
    failed = "failed"


class ContentKind(str, enum.Enum):
    pet_of_day = "pet_of_day"
    style_poll = "style_poll"
    cs_reply = "cs_reply"


class QueueItem(Base):
    __tablename__ = "content_queue"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    store_id: Mapped[str] = mapped_column(String(32), index=True, default="pawtraitry")
    kind: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default=QueueStatus.pending_approval.value)
    title: Mapped[str] = mapped_column(String(256), default="")
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    media_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    caption_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_payloads: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class DailySpend(Base):
    __tablename__ = "content_daily_spend"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    gbp: Mapped[float] = mapped_column(Float, default=0.0)


class PetPoolEntry(Base):
    """Curated or synced pets approved for social use."""

    __tablename__ = "content_pet_pool"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(128), default="Pet")
    before_path: Mapped[str] = mapped_column(Text)
    after_path: Mapped[str] = mapped_column(Text)
    style_name: Mapped[str] = mapped_column(String(128), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
