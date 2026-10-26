from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.publishers.base import Publisher


class TikTokPublisher(Publisher):
    """Content Posting API — private/draft until app audit."""

    platform = "tiktok"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def enabled(self) -> bool:
        return bool(
            self.settings.tiktok_client_key
            and self.settings.tiktok_client_secret
            and self.settings.tiktok_access_token
        )

    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                headers={
                    "Authorization": f"Bearer {self.settings.tiktok_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "post_info": {
                        "title": payload.get("text", "")[:150],
                        "privacy_level": "SELF_ONLY",
                        "disable_duet": False,
                        "disable_comment": False,
                    },
                    "source_info": {"source": "FILE_UPLOAD", "video_size": payload.get("video_size", 0)},
                },
            )
            response.raise_for_status()
            return response.json().get("data", {}).get("publish_id", "tiktok-draft")
