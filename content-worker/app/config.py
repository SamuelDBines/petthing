from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    content_worker_secret: str = Field(default="dev-change-me", alias="CONTENT_WORKER_SECRET")
    dry_run: bool = Field(default=True, alias="CONTENT_WORKER_DRY_RUN")
    data_dir: str = Field(default=".data/content-worker", alias="CONTENT_WORKER_DATA_DIR")
    output_dir: str = Field(default=".data/content-worker/output", alias="CONTENT_WORKER_OUTPUT_DIR")
    app_url: str = Field(default="http://localhost:3000", alias="NEXT_PUBLIC_APP_URL")
    store_name: str = Field(default="Pawtraitry", alias="CONTENT_STORE_NAME")

    # Main app Postgres (order lookup + opted-in pets). SQLite used when unset.
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    content_database_url: str | None = Field(default=None, alias="CONTENT_DATABASE_URL")

    # Scheduler
    scheduler_enabled: bool = Field(default=True, alias="CONTENT_SCHEDULER_ENABLED")
    daily_plan_cron: str = Field(default="0 7 * * *", alias="CONTENT_DAILY_PLAN_CRON")
    poll_plan_cron: str = Field(default="0 10 * * 1", alias="CONTENT_POLL_PLAN_CRON")
    timezone: str = Field(default="Europe/London", alias="CONTENT_TIMEZONE")

    # Spend caps (GBP)
    max_daily_ai_spend_gbp: float = Field(default=5.0, alias="CONTENT_MAX_DAILY_AI_SPEND_GBP")
    llm_cost_per_1k_tokens_gbp: float = Field(default=0.002, alias="CONTENT_LLM_COST_PER_1K_GBP")

    # LLM / image AI (optional)
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    fal_key: str | None = Field(default=None, alias="FAL_KEY")

    # Auto-approve per platform (JSON map or individual flags)
    auto_approve_platforms: str = Field(default="{}", alias="CONTENT_AUTO_APPROVE_PLATFORMS")

    # YouTube
    youtube_client_id: str | None = Field(default=None, alias="YOUTUBE_CLIENT_ID")
    youtube_client_secret: str | None = Field(default=None, alias="YOUTUBE_CLIENT_SECRET")
    youtube_refresh_token: str | None = Field(default=None, alias="YOUTUBE_REFRESH_TOKEN")

    # Instagram / Meta Graph
    meta_access_token: str | None = Field(default=None, alias="META_ACCESS_TOKEN")
    meta_ig_user_id: str | None = Field(default=None, alias="META_IG_USER_ID")

    # Pinterest
    pinterest_access_token: str | None = Field(default=None, alias="PINTEREST_ACCESS_TOKEN")
    pinterest_board_id: str | None = Field(default=None, alias="PINTEREST_BOARD_ID")

    # TikTok
    tiktok_client_key: str | None = Field(default=None, alias="TIKTOK_CLIENT_KEY")
    tiktok_client_secret: str | None = Field(default=None, alias="TIKTOK_CLIENT_SECRET")
    tiktok_access_token: str | None = Field(default=None, alias="TIKTOK_ACCESS_TOKEN")

    # X (off by default — paid API)
    x_enabled: bool = Field(default=False, alias="X_ENABLED")
    x_api_key: str | None = Field(default=None, alias="X_API_KEY")
    x_api_secret: str | None = Field(default=None, alias="X_API_SECRET")
    x_access_token: str | None = Field(default=None, alias="X_ACCESS_TOKEN")
    x_access_token_secret: str | None = Field(default=None, alias="X_ACCESS_TOKEN_SECRET")
    x_bearer_token: str | None = Field(default=None, alias="X_BEARER_TOKEN")

    # Resend inbound (customer service)
    resend_webhook_secret: str | None = Field(default=None, alias="RESEND_WEBHOOK_SECRET")

    # Local demo assets (repo-relative when running from monorepo root)
    demo_before_path: str = Field(default="public/examples/pet-before.jpg", alias="CONTENT_DEMO_BEFORE")
    demo_after_path: str = Field(default="public/examples/pet-after.jpg", alias="CONTENT_DEMO_AFTER")
    repo_root: str = Field(default="..", alias="CONTENT_REPO_ROOT")

    def auto_approve_map(self) -> dict[str, bool]:
        try:
            parsed: dict[str, Any] = json.loads(self.auto_approve_platforms)
            return {str(k): bool(v) for k, v in parsed.items()}
        except json.JSONDecodeError:
            return {}


@lru_cache
def get_settings() -> Settings:
    return Settings()
