from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.publishers.base import Publisher


class XPublisher(Publisher):
    platform = "x"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def enabled(self) -> bool:
        return bool(
            self.settings.x_enabled
            and self.settings.x_bearer_token
            and self.settings.x_api_key
            and self.settings.x_api_secret
            and self.settings.x_access_token
            and self.settings.x_access_token_secret
        )

    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        main_text = payload.get("text", "")
        link = payload.get("link")
        async with httpx.AsyncClient(timeout=60.0) as client:
            tweet = await client.post(
                "https://api.twitter.com/2/tweets",
                headers={"Authorization": f"Bearer {self.settings.x_bearer_token}"},
                json={"text": main_text},
            )
            tweet.raise_for_status()
            tweet_id = tweet.json()["data"]["id"]
            if link:
                await client.post(
                    "https://api.twitter.com/2/tweets",
                    headers={"Authorization": f"Bearer {self.settings.x_bearer_token}"},
                    json={"text": link, "reply": {"in_reply_to_tweet_id": tweet_id}},
                )
            return tweet_id
