from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import ContentKind, QueueItem, QueueStatus
from app.publishers.registry import get_publishers


def create_queue_item(
    db: Session,
    *,
    kind: ContentKind,
    title: str,
    media_path: str | None,
    caption_path: str | None,
    platform_payloads: dict[str, Any],
    metadata: dict[str, Any] | None = None,
    status: QueueStatus = QueueStatus.pending_approval,
) -> QueueItem:
    item = QueueItem(
        id=str(uuid.uuid4()),
        kind=kind.value,
        status=status.value,
        title=title,
        media_path=media_path,
        caption_path=caption_path,
        platform_payloads=platform_payloads,
        metadata_=metadata or {},
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_queue(db: Session, status: str | None = None) -> list[QueueItem]:
    stmt = select(QueueItem).order_by(QueueItem.created_at.desc())
    if status:
        stmt = stmt.where(QueueItem.status == status)
    return list(db.scalars(stmt).all())


def get_item(db: Session, item_id: str) -> QueueItem | None:
    return db.get(QueueItem, item_id)


def set_status(db: Session, item: QueueItem, status: QueueStatus, error: str | None = None) -> QueueItem:
    item.status = status.value
    item.error = error
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


async def publish_item(db: Session, settings: Settings, item: QueueItem) -> QueueItem:
    if item.status not in (QueueStatus.approved.value, QueueStatus.pending_approval.value):
        return item

    auto = settings.auto_approve_map()
    publishers = get_publishers(settings)
    errors: list[str] = []

    for platform, publisher in publishers.items():
        payload = item.platform_payloads.get(platform)
        if not payload:
            continue
        if item.status == QueueStatus.pending_approval.value and not auto.get(platform, False):
            continue
        if settings.dry_run:
            continue
        try:
            await publisher.publish(payload, media_path=item.media_path)
        except Exception as exc:  # noqa: BLE001 — aggregate for queue item
            errors.append(f"{platform}: {exc}")

    if settings.dry_run:
        set_status(db, item, QueueStatus.approved)
        return item

    if errors:
        return set_status(db, item, QueueStatus.failed, "; ".join(errors))

    item.published_at = datetime.now(timezone.utc)
    return set_status(db, item, QueueStatus.published)
