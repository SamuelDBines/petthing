from __future__ import annotations

from app.config import Settings
from app.publishers.registry import get_publishers


def test_publishers_disabled_without_credentials() -> None:
    settings = Settings()
    assert get_publishers(settings) == {}


def test_x_off_by_default() -> None:
    settings = Settings(
        X_ENABLED=True,
        X_BEARER_TOKEN="x",
        X_API_KEY="k",
        X_API_SECRET="s",
        X_ACCESS_TOKEN="a",
        X_ACCESS_TOKEN_SECRET="b",
    )
    pubs = get_publishers(settings)
    assert "x" in pubs
