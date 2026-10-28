"""Lightweight catalog promo drafts for Fixmonger / Jinglefold (approval queue)."""

from __future__ import annotations

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import ContentKind, QueueStatus
from app.queue.service import create_queue_item

STORE_HOOKS = {
    "pawtraitry": "Custom pet portraits with a human review: digital delivery and UK prints.",
    "fixmonger": "British winter fixes that actually work: frost covers, draught curtains, honest kits.",
    "jinglefold": "Personalised Christmas decor with a preview before you pay: baubles, stockings, tree bundles.",
}


async def generate_store_catalog_post(db: Session, settings: Settings, store_id: str) -> dict:
    if store_id not in STORE_HOOKS:
        raise ValueError(f"Unknown store_id {store_id}")
    now = datetime.now(ZoneInfo(settings.timezone))
    slug = f"{store_id}-catalog-{now.strftime('%Y%m%d')}"
    hook = STORE_HOOKS[store_id]
    copies = {
        "instagram": f"{hook} Shop UK delivery. #{store_id}",
        "facebook": hook,
        "pinterest": f"{hook} Tap through for the full range.",
        "tiktok": f"{hook} Link in bio.",
    }
    item = create_queue_item(
        db,
        kind=ContentKind.pet_of_day,
        title=f"{store_id} catalog highlight",
        media_path=None,
        caption_path=None,
        platform_payloads={p: {"text": t} for p, t in copies.items()},
        metadata={"generator": "store_catalog", "store_id": store_id},
        status=QueueStatus.pending_approval,
    )
    item.store_id = store_id
    db.commit()
    return {"queue_id": item.id, "store_id": store_id}
