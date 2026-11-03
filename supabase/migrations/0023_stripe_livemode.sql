alter table orders add column if not exists stripe_livemode boolean;
alter table shop_orders add column if not exists stripe_livemode boolean;
update orders set stripe_livemode = false where stripe_livemode is null and stripe_payment_intent_id is not null;
update shop_orders set stripe_livemode = false where stripe_livemode is null and stripe_payment_intent_id is not null;
