from __future__ import annotations

import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import Settings
from app.db.session import SessionLocal, init_db
from app.planner.daily import generate_pet_of_day
from app.planner.poll import generate_style_poll
from app.planner.store_posts import generate_store_catalog_post

logger = logging.getLogger(__name__)


def start_scheduler(settings: Settings) -> AsyncIOScheduler | None:
    if not settings.scheduler_enabled:
        return None

    scheduler = AsyncIOScheduler(timezone=ZoneInfo(settings.timezone))

    async def daily_job() -> None:
        init_db()
        db = SessionLocal()
        try:
            result = await generate_pet_of_day(db, settings)
            logger.info("Daily pet plan: %s", result)
        finally:
            db.close()

    async def poll_job() -> None:
        init_db()
        db = SessionLocal()
        try:
            result = await generate_style_poll(db, settings)
            logger.info("Weekly poll plan: %s", result)
        finally:
            db.close()

    async def catalog_stores_job() -> None:
        init_db()
        db = SessionLocal()
        try:
            for store_id in ("pawtraitry", "fixmonger", "jinglefold"):
                result = await generate_store_catalog_post(db, settings, store_id)
                logger.info("Store catalog post: %s", result)
        finally:
            db.close()

    scheduler.add_job(daily_job, CronTrigger.from_crontab(settings.daily_plan_cron))
    scheduler.add_job(poll_job, CronTrigger.from_crontab(settings.poll_plan_cron))
    scheduler.add_job(catalog_stores_job, CronTrigger.from_crontab(settings.store_promo_cron))
    scheduler.start()
    return scheduler
