from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import Settings
from app.copy.generator import generate_platform_copy, is_christmas_season
from app.db.models import ContentKind, QueueStatus
from app.queue.service import create_queue_item

CHRISTMAS_STYLES = [
    "Snowy window portrait",
    "Cosy jumper evening",
    "Winter forest walk",
]
DEFAULT_STYLES = [
    "Victorian haunted portrait",
    "Witch and familiar",
    "Cosy spooky storybook",
]


async def generate_style_poll(db: Session, settings: Settings, *, now: datetime | None = None) -> dict:
    now = now or datetime.now(ZoneInfo(settings.timezone))
    styles = CHRISTMAS_STYLES if is_christmas_season(now, settings.timezone) else DEFAULT_STYLES
    options = "\n".join(f"{i + 1}. {name}" for i, name in enumerate(styles))

    copies, llm_cost = await generate_platform_copy(
        db,
        settings,
        pet_label="community",
        style_name=styles[0],
        kind="style_poll",
        now=now,
    )

    poll_body = f"Vote in the comments:\n{options}"
    platform_payloads = {
        platform: {
            "text": f"{copies[platform]}\n\n{poll_body}",
            "title": "Which style next?",
        }
        for platform in copies
    }

    item = create_queue_item(
        db,
        kind=ContentKind.style_poll,
        title="Weekly style poll",
        media_path=None,
        caption_path=None,
        platform_payloads=platform_payloads,
        metadata={"styles": styles, "llm_cost_gbp": llm_cost},
        status=QueueStatus.pending_approval,
    )
    return {"queue_id": item.id, "styles": styles}
