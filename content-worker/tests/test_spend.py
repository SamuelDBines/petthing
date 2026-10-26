from __future__ import annotations

from pathlib import Path

from app.config import Settings, get_settings
from app.db.session import SessionLocal, init_db
from app.spend.cap import can_spend, get_spend_today, record_spend


def test_spend_cap(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("CONTENT_WORKER_DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    from app.db import session as session_mod

    session_mod.engine = session_mod.create_engine(
        f"sqlite:///{tmp_path / 'content.db'}", connect_args={"check_same_thread": False}
    )
    session_mod.SessionLocal = session_mod.sessionmaker(bind=session_mod.engine, autoflush=False, autocommit=False)
    init_db()
    db = SessionLocal()
    settings = Settings(CONTENT_MAX_DAILY_AI_SPEND_GBP=1.0)
    try:
        assert get_spend_today(db) == 0.0
        assert can_spend(db, settings, 0.5)
        record_spend(db, 0.5)
        assert can_spend(db, settings, 0.4)
        assert not can_spend(db, settings, 0.6)
    finally:
        db.close()
