from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import PetPoolEntry


@dataclass
class PetSource:
    label: str
    style_name: str
    before_path: Path
    after_path: Path
    order_id: str | None = None


def _resolve(path: str, settings: Settings) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    return (Path(settings.repo_root) / p).resolve()


def ensure_demo_pool(db: Session, settings: Settings) -> None:
    before = _resolve(settings.demo_before_path, settings)
    after = _resolve(settings.demo_after_path, settings)
    if not before.exists() or not after.exists():
        return
    existing = db.scalar(select(PetPoolEntry).limit(1))
    if existing:
        return
    db.add(
        PetPoolEntry(
            id=str(uuid.uuid4()),
            label="Demo pup",
            before_path=str(before),
            after_path=str(after),
            style_name="Victorian haunted portrait",
            active=True,
        )
    )
    db.commit()


def _from_pool(db: Session) -> PetSource | None:
    stmt = (
        select(PetPoolEntry)
        .where(PetPoolEntry.active.is_(True))
        .order_by(PetPoolEntry.last_used_at.asc().nullsfirst())
        .limit(1)
    )
    row = db.scalar(stmt)
    if not row:
        return None
    row.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return PetSource(
        label=row.label,
        style_name=row.style_name,
        before_path=Path(row.before_path),
        after_path=Path(row.after_path),
        order_id=row.order_id,
    )


def _from_main_db(settings: Settings) -> PetSource | None:
    """Opted-in delivered pet orders when sharing the app Postgres."""
    if not settings.database_url:
        return None
    try:
        from sqlalchemy import create_engine

        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            # social_share_opt_in may be added later; fall back to pet_pool sync.
            row = conn.execute(
                text(
                    """
                    SELECT o.id, o.subject_type
                    FROM orders o
                    WHERE o.status = 'delivered'
                      AND o.subject_type = 'pet'
                      AND o.consent_at IS NOT NULL
                    ORDER BY o.delivered_at DESC NULLS LAST
                    LIMIT 1
                    """
                )
            ).mappings().first()
            if not row:
                return None
            assets = conn.execute(
                text(
                    """
                    SELECT kind, storage_path
                    FROM assets
                    WHERE order_id = :oid AND kind IN ('upload', 'result')
                    """
                ),
                {"oid": row["id"]},
            ).mappings().all()
            before = next((a["storage_path"] for a in assets if a["kind"] == "upload"), None)
            after = next((a["storage_path"] for a in assets if a["kind"] == "result"), None)
            if not before or not after:
                return None
            return PetSource(
                label="A happy pet",
                style_name="Seasonal portrait",
                before_path=Path(before),
                after_path=Path(after),
                order_id=str(row["id"]),
            )
    except Exception:
        return None


def pick_pet(db: Session, settings: Settings) -> PetSource:
    ensure_demo_pool(db, settings)
    source = _from_pool(db) or _from_main_db(settings)
    if source:
        return source
    before = _resolve(settings.demo_before_path, settings)
    after = _resolve(settings.demo_after_path, settings)
    return PetSource(
        label="Demo pup",
        style_name="Victorian haunted portrait",
        before_path=before,
        after_path=after,
    )
