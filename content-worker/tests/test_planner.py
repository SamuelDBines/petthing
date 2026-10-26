from __future__ import annotations

import asyncio
from pathlib import Path

from app.config import get_settings
from app.copy.generator import is_christmas_season
from app.db.session import SessionLocal, init_db
from app.planner.daily import generate_pet_of_day
from datetime import datetime
from zoneinfo import ZoneInfo


def test_christmas_season() -> None:
    nov = datetime(2026, 11, 15, tzinfo=ZoneInfo("Europe/London"))
    oct_ = datetime(2026, 10, 15, tzinfo=ZoneInfo("Europe/London"))
    assert is_christmas_season(nov, "Europe/London")
    assert not is_christmas_season(oct_, "Europe/London")


def test_generate_pet_of_day_dry_run(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("CONTENT_WORKER_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CONTENT_WORKER_OUTPUT_DIR", str(tmp_path / "output"))
    monkeypatch.setenv("CONTENT_REPO_ROOT", str(Path(__file__).resolve().parents[2]))
    monkeypatch.setenv("CONTENT_WORKER_DRY_RUN", "true")
    get_settings.cache_clear()

    init_db()
    db = SessionLocal()
    try:
        result = asyncio.run(generate_pet_of_day(db, get_settings()))
        assert "queue_id" in result
        assert Path(result["video"]).exists() or Path(str(result["video"]).replace(".mp4", ".png")).exists()
        assert Path(result["captions"]).exists()
    finally:
        db.close()
