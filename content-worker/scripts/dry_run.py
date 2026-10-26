#!/usr/bin/env python3
"""Generate a sample pet-of-the-day video and captions without posting."""

from __future__ import annotations

import asyncio
import os
import sys

# Run from content-worker/ with repo root one level up
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

os.environ.setdefault("CONTENT_WORKER_DRY_RUN", "true")
os.environ.setdefault("CONTENT_REPO_ROOT", os.path.abspath(os.path.join(ROOT, "..")))
os.environ.setdefault("CONTENT_SCHEDULER_ENABLED", "false")

from app.config import get_settings
from app.db.session import SessionLocal, init_db
from app.planner.daily import generate_pet_of_day


async def main() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    init_db()
    db = SessionLocal()
    try:
        result = await generate_pet_of_day(db, settings)
        print("Dry-run complete:")
        for key, value in result.items():
            print(f"  {key}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
