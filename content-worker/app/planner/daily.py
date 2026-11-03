from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import Settings
from app.copy.generator import generate_platform_copy, is_christmas_season
from app.db.models import ContentKind, QueueStatus
from app.planner.pets import pick_pet
from app.queue.service import create_queue_item
from app.video.render import render_before_after_short


async def generate_pet_of_day(db: Session, settings: Settings, *, now: datetime | None = None) -> dict:
    now = now or datetime.now(ZoneInfo(settings.timezone))
    pet = pick_pet(db, settings)
    christmas = is_christmas_season(now, settings.timezone)
    hook = (
        "Christmas pet portrait reveal 🎄"
        if christmas
        else "Watch this photo become a painted portrait"
    )
    reveal = (
        f"From snap to {pet.style_name}: order your Christmas gift at Pawtraitry."
        if christmas
        else f"From snap to {pet.style_name}. UK pet portrait gifts."
    )

    slug = f"pet-of-day-{now.strftime('%Y%m%d')}"
    out_dir = Path(settings.output_dir) / slug
    render = render_before_after_short(
        before_path=pet.before_path,
        after_path=pet.after_path,
        output_dir=out_dir,
        slug=slug,
        hook=hook,
        reveal_line=reveal,
    )

    copies, llm_cost = await generate_platform_copy(
        db,
        settings,
        pet_label=pet.label,
        style_name=pet.style_name,
        kind=ContentKind.pet_of_day.value,
        now=now,
    )

    platform_payloads = {
        platform: {
            "text": text,
            "title": f"{pet.label}, before and after",
            "video_url": None,
        }
        for platform, text in copies.items()
    }

    item = create_queue_item(
        db,
        kind=ContentKind.pet_of_day,
        title=f"Pet of the day: {pet.label}",
        media_path=str(render.video_path),
        caption_path=str(render.caption_txt_path),
        platform_payloads=platform_payloads,
        metadata={
            "christmas": christmas,
            "pet_label": pet.label,
            "style": pet.style_name,
            "llm_cost_gbp": llm_cost,
            "srt": str(render.srt_path),
        },
        status=QueueStatus.pending_approval,
    )

    return {
        "queue_id": item.id,
        "video": str(render.video_path),
        "captions": str(render.caption_txt_path),
        "srt": str(render.srt_path),
        "dry_run": settings.dry_run,
    }
