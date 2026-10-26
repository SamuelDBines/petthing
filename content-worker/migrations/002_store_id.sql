ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS store_id VARCHAR(32) NOT NULL DEFAULT 'pawtraitry';
CREATE INDEX IF NOT EXISTS content_queue_store_idx ON content_queue (store_id, status);
