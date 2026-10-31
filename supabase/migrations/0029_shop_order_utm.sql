alter table shop_orders add column if not exists utm jsonb not null default '{}'::jsonb;
