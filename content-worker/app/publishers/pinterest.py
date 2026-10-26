from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.publishers.base import Publisher


class PinterestPublisher(Publisher):
    platform = "pinterest"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def enabled(self) -> bool:
        return bool(self.settings.pinterest_access_token and self.settings.pinterest_board_id)

    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.pinterest.com/v5/pins",
                headers={
                    "Authorization": f"Bearer {self.settings.pinterest_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "board_id": self.settings.pinterest_board_id,
                    "title": payload.get("title", "Pet portrait reveal"),
                    "description": payload.get("text", ""),
                    "media_source": {
                        "source_type": "video_url",
                        "url": payload.get("video_url"),
                    },
                },
            )
            response.raise_for_status()
            return response.json().get("id", "pinterest-pin")
