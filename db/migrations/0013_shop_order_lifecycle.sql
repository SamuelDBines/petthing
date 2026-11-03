alter table shop_orders add column if not exists marketing_consent boolean not null default false;
alter table shop_orders add column if not exists abandoned_reminder_sent_at timestamptz;
alter table shop_orders add column if not exists shipped_at timestamptz;
alter table shop_orders add column if not exists delivered_at timestamptz;
alter table shop_orders add column if not exists fulfillment_error text;
