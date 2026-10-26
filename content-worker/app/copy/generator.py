from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.config import Settings
from app.spend.cap import can_spend, estimate_llm_cost_gbp, record_spend
from sqlalchemy.orm import Session


PLATFORM_LIMITS = {
    "youtube": 5000,
    "instagram": 2200,
    "tiktok": 4000,
    "pinterest": 500,
    "x": 280,
}


def is_christmas_season(now: datetime, tz: str) -> bool:
    local = now.astimezone(ZoneInfo(tz))
    return local.month >= 11 or local.month == 12


def _template_copy(
    settings: Settings,
    *,
    pet_label: str,
    style_name: str,
    christmas: bool,
    kind: str,
) -> dict[str, str]:
    theme = "Christmas" if christmas else "seasonal"
    base_hashtags = "#petportrait #dogportrait #catportrait #ukgifts #petgifts #beforeandafter"
    if christmas:
        base_hashtags += " #christmasgifts #christmaspets"

    if kind == "style_poll":
        hook = f"Which {theme.lower()} style should we paint next? Vote in the comments."
        body = f"We're planning the next Pawtraitry {theme.lower()} drop. Pick your favourite style."
    else:
        hook = f"Pet of the day: watch {pet_label} turn into a {style_name} portrait."
        body = (
            f"Real customer photo → AI-painted {theme.lower()} portrait. "
            f"Order your own at {settings.app_url.rstrip('/')} (UK delivery)."
        )

    copies: dict[str, str] = {}
    for platform, limit in PLATFORM_LIMITS.items():
        text = f"{hook}\n\n{body}\n\n{base_hashtags}"
        if platform == "x":
            text = f"{hook} {settings.app_url.rstrip('/')}"
        copies[platform] = text[:limit]
    return copies


async def generate_platform_copy(
    db: Session,
    settings: Settings,
    *,
    pet_label: str,
    style_name: str,
    kind: str = "pet_of_day",
    now: datetime | None = None,
) -> tuple[dict[str, str], float]:
    """Returns per-platform copy and GBP cost recorded."""
    now = now or datetime.now(ZoneInfo(settings.timezone))
    christmas = is_christmas_season(now, settings.timezone)

    if not settings.openai_api_key:
        return _template_copy(
            settings, pet_label=pet_label, style_name=style_name, christmas=christmas, kind=kind
        ), 0.0

    est = estimate_llm_cost_gbp(settings, 800)
    if not can_spend(db, settings, est):
        return _template_copy(
            settings, pet_label=pet_label, style_name=style_name, christmas=christmas, kind=kind
        ), 0.0

    system = (
        "You write short social posts for a UK pet portrait gift shop (cats and dogs). "
        "Tone: warm, not salesy. Include hashtags on Instagram/TikTok/Pinterest/YouTube. "
        "Never promise same-day delivery. JSON only with keys: youtube, instagram, tiktok, pinterest, x."
    )
    user = (
        f"Kind: {kind}. Pet: {pet_label}. Style: {style_name}. "
        f"Christmas theme: {christmas}. Site: {settings.app_url}. "
        f"For x, keep under 240 chars and put the link once; other platforms can be longer."
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed: dict[str, Any] = json.loads(content)

    copies = {k: str(parsed.get(k, ""))[:PLATFORM_LIMITS[k]] for k in PLATFORM_LIMITS}
    usage = data.get("usage", {})
    tokens = int(usage.get("total_tokens", 800))
    cost = estimate_llm_cost_gbp(settings, tokens)
    record_spend(db, cost)
    return copies, cost
