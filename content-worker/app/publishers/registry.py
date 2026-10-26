from __future__ import annotations

from app.config import Settings
from app.publishers.base import Publisher
from app.publishers.instagram import InstagramPublisher
from app.publishers.pinterest import PinterestPublisher
from app.publishers.tiktok import TikTokPublisher
from app.publishers.twitter import XPublisher
from app.publishers.youtube import YouTubePublisher


def get_publishers(settings: Settings) -> dict[str, Publisher]:
    candidates: list[Publisher] = [
        YouTubePublisher(settings),
        InstagramPublisher(settings),
        PinterestPublisher(settings),
        TikTokPublisher(settings),
        XPublisher(settings),
    ]
    return {p.platform: p for p in candidates if p.enabled()}
