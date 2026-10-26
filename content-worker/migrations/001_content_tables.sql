-- Optional: content worker uses SQLAlchemy create_all on SQLite by default.
-- Run against CONTENT_DATABASE_URL or a dedicated schema when sharing Postgres.

CREATE TABLE IF NOT EXISTS content_queue (
  id VARCHAR(36) PRIMARY KEY,
  kind VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  title VARCHAR(256) NOT NULL DEFAULT '',
  scheduled_for TIMESTAMPTZ,
  media_path TEXT,
  caption_path TEXT,
  platform_payloads JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE IF NOT EXISTS content_daily_spend (
  day DATE PRIMARY KEY,
  gbp DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS content_pet_pool (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36),
  label VARCHAR(128) NOT NULL DEFAULT 'Pet',
  before_path TEXT NOT NULL,
  after_path TEXT NOT NULL,
  style_name VARCHAR(128) NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
