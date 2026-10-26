from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import DailySpend


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def get_spend_today(db: Session) -> float:
    row = db.get(DailySpend, today_utc())
    return float(row.gbp) if row else 0.0


def can_spend(db: Session, settings: Settings, amount_gbp: float) -> bool:
    return get_spend_today(db) + amount_gbp <= settings.max_daily_ai_spend_gbp


def record_spend(db: Session, amount_gbp: float) -> float:
    if amount_gbp <= 0:
        return get_spend_today(db)
    day = today_utc()
    row = db.get(DailySpend, day)
    if row is None:
        row = DailySpend(day=day, gbp=0.0)
        db.add(row)
    row.gbp = float(row.gbp) + amount_gbp
    db.commit()
    db.refresh(row)
    return float(row.gbp)


def estimate_llm_cost_gbp(settings: Settings, tokens: int) -> float:
    return (tokens / 1000.0) * settings.llm_cost_per_1k_tokens_gbp
