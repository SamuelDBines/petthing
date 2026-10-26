from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.publishers.base import Publisher


class InstagramPublisher(Publisher):
    platform = "instagram"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def enabled(self) -> bool:
        return bool(self.settings.meta_access_token and self.settings.meta_ig_user_id)

    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        video_url = payload.get("video_url")
        if not video_url:
            raise ValueError("Instagram Reels require video_url in payload (public HTTPS)")
        token = self.settings.meta_access_token
        ig_user = self.settings.meta_ig_user_id
        base = f"https://graph.facebook.com/v21.0/{ig_user}"
        async with httpx.AsyncClient(timeout=120.0) as client:
            create = await client.post(
                f"{base}/media",
                params={
                    "media_type": "REELS",
                    "video_url": video_url,
                    "caption": payload.get("text", ""),
                    "access_token": token,
                },
            )
            create.raise_for_status()
            creation_id = create.json()["id"]
            publish = await client.post(
                f"{base}/media_publish",
                params={"creation_id": creation_id, "access_token": token},
            )
            publish.raise_for_status()
            return publish.json().get("id", creation_id)
