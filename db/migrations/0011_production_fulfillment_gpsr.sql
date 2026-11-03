alter table orders add column if not exists shipping jsonb;
alter table orders add column if not exists partner_fulfillment jsonb;

alter table shop_orders add column if not exists stripe_payment_intent_id text;
alter table shop_orders add column if not exists amount_refunded_pence integer not null default 0;

alter table catalogue_products add column if not exists gpsr jsonb;
