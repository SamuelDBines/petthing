create table if not exists orders (
  id uuid primary key,
  created_at timestamptz not null,
  email text not null,
  theme_id text not null,
  subject_type text not null,
  tier_id text not null,
  style_ids text[] not null,
  card_names text not null default '',
  status text not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_pence integer not null,
  priority boolean not null default false,
  consent_at timestamptz,
  utm jsonb not null default '{}'::jsonb,
  referral_code_used text,
  own_referral_code text not null,
  results_token text not null unique,
  upload_token text not null,
  generation_cost_gbp numeric(12, 4) not null default 0,
  delivered_at timestamptz,
  photos_delete_after timestamptz,
  results_delete_after timestamptz,
  ip_hash text not null default '',
  uploads_deleted_at timestamptz,
  results_deleted_at timestamptz,
  failure_reason text,
  processed_sessions text[] not null default '{}',
  referral_reward_granted boolean not null default false,
  pending_bonus_email boolean not null default false,
  offer text not null default 'one_off',
  stripe_subscription_id text,
  subscription_status text,
  payments jsonb not null default '[]'::jsonb
);

create index if not exists orders_subscription_idx on orders (stripe_subscription_id);

create table if not exists assets (
  id uuid primary key,
  order_id uuid not null references orders(id),
  kind text not null,
  style_id text,
  variant_index integer,
  storage_path text not null,
  bucket text not null,
  content_type text not null,
  moderation text not null,
  created_at timestamptz not null
);

create unique index if not exists assets_kind_variant_idx
  on assets (order_id, kind, style_id, variant_index)
  where style_id is not null and variant_index is not null;

create table if not exists jobs (
  id uuid primary key,
  order_id uuid not null references orders(id),
  style_id text not null,
  variant_index integer not null,
  status text not null,
  attempts integer not null default 0,
  provider_request_id text,
  last_error text,
  cost_gbp numeric(12, 4) not null default 0,
  priority boolean not null default false,
  locked_until timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create unique index if not exists jobs_order_style_variant_idx
  on jobs (order_id, style_id, variant_index);

create index if not exists jobs_claim_idx
  on jobs (priority desc, created_at)
  where status in ('queued', 'submitted', 'running');

create table if not exists events (
  id uuid primary key,
  type text not null,
  order_id uuid,
  created_at timestamptz not null
);

create table if not exists prints (
  id uuid primary key,
  order_id uuid not null references orders(id),
  product_id text not null,
  asset_id uuid not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  prodigi_order_id text,
  status text not null,
  shipping jsonb,
  error text,
  created_at timestamptz not null
);

create table if not exists preorders (
  id uuid primary key,
  order_id uuid,
  email text not null,
  theme_id text not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_pence integer not null,
  status text not null,
  created_at timestamptz not null
);

create table if not exists app_settings (
  id integer primary key,
  theme_mode text not null default 'auto',
  active_theme_id text not null default 'halloween',
  sales_paused boolean not null default false,
  queue_halted boolean not null default false,
  halt_reason text,
  halt_notified_on text
);

create table if not exists rate_buckets (
  bucket_key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

create table if not exists daily_spend (
  day text primary key,
  gbp numeric(12, 4) not null
);

insert into app_settings (id, theme_mode, active_theme_id)
values (1, 'auto', 'halloween')
on conflict (id) do nothing;

create index if not exists orders_checkout_idx on orders (stripe_checkout_session_id);
create index if not exists assets_order_idx on assets (order_id);
create index if not exists events_type_idx on events (type, created_at);

grant select, insert, update, delete on
  orders, assets, jobs, events, prints, preorders, app_settings, rate_buckets, daily_spend
to portrait_spell_app;
