from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.publishers.base import Publisher


class YouTubePublisher(Publisher):
    platform = "youtube"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def enabled(self) -> bool:
        return bool(
            self.settings.youtube_client_id
            and self.settings.youtube_client_secret
            and self.settings.youtube_refresh_token
        )

    async def _access_token(self) -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": self.settings.youtube_client_id,
                    "client_secret": self.settings.youtube_client_secret,
                    "refresh_token": self.settings.youtube_refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        if not media_path:
            raise ValueError("YouTube Shorts require a video file")
        token = await self._access_token()
        # Resumable upload metadata — actual binary upload omitted in worker stub when dry_run off
        async with httpx.AsyncClient(timeout=120.0) as client:
            init = await client.post(
                "https://www.googleapis.com/upload/youtube/v3/videos",
                params={"uploadType": "resumable", "part": "snippet,status"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Upload-Content-Type": "video/mp4",
                },
                json={
                    "snippet": {
                        "title": payload.get("title", "Pet portrait reveal"),
                        "description": payload.get("text", ""),
                        "categoryId": "15",
                    },
                    "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
                },
            )
            init.raise_for_status()
            upload_url = init.headers.get("Location")
            if not upload_url:
                raise RuntimeError("YouTube did not return an upload URL")
            with open(media_path, "rb") as video_file:
                upload = await client.put(
                    upload_url,
                    content=video_file.read(),
                    headers={"Content-Type": "video/mp4"},
                )
            upload.raise_for_status()
            return upload.json().get("id", "youtube-uploaded")
