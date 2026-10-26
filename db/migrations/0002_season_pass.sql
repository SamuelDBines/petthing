alter table orders add column if not exists offer text not null default 'one_off';
alter table orders add column if not exists stripe_subscription_id text;
alter table orders add column if not exists subscription_status text;

create index if not exists orders_subscription_idx on orders (stripe_subscription_id);

grant select, insert, update, delete on
  orders, assets, jobs, events, prints, preorders, app_settings, rate_buckets, daily_spend
to portrait_spell_app;
