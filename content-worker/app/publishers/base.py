from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Publisher(ABC):
    platform: str

    @abstractmethod
    def enabled(self) -> bool:
        ...

    @abstractmethod
    async def publish(self, payload: dict[str, Any], *, media_path: str | None) -> str:
        """Publish content. Returns remote id or dry-run marker."""
