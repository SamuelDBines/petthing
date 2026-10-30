alter table shop_orders add column if not exists stuck_alert_sent_at timestamptz;
