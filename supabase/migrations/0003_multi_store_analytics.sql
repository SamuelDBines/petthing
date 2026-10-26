create table if not exists stores (
  id text primary key,
  slug text not null unique,
  domains text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table orders add column if not exists store_id text not null default 'pawtraitry';
alter table events add column if not exists store_id text not null default 'pawtraitry';
alter table preorders add column if not exists store_id text not null default 'pawtraitry';

create index if not exists orders_store_created_idx on orders (store_id, created_at desc);
create index if not exists events_store_type_idx on events (store_id, type, created_at);

alter table daily_spend add column if not exists store_id text not null default 'pawtraitry';

alter table daily_spend drop constraint if exists daily_spend_pkey;
alter table daily_spend add primary key (store_id, day);

alter table app_settings add column if not exists store_id text not null default 'pawtraitry';
alter table app_settings drop constraint if exists app_settings_pkey;
alter table app_settings add primary key (store_id);

insert into stores (id, slug, domains, config)
values ('pawtraitry', 'pawtraitry', array['pawtraitry.co.uk','www.pawtraitry.co.uk','pawtraitry.localhost','localhost'], '{}'::jsonb),
       ('wildframe', 'wildframe', array['wildframe.studio','www.wildframe.studio','wildframe.localhost'], '{}'::jsonb)
on conflict (id) do nothing;

insert into app_settings (store_id, theme_mode, active_theme_id, sales_paused, queue_halted)
values ('pawtraitry', 'auto', 'halloween', false, false),
       ('wildframe', 'manual', 'evergreen', false, false)
on conflict (store_id) do nothing;

create table if not exists visitor_sessions (
  id uuid primary key,
  store_id text not null references stores(id),
  visitor_id text not null,
  consent_level text not null default 'aggregate',
  is_new_visitor boolean not null default true,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_path text not null,
  exit_path text,
  device_type text,
  country_code text,
  started_at timestamptz not null,
  ended_at timestamptz,
  pageview_count integer not null default 1,
  bounced boolean not null default false,
  duration_ms integer not null default 0,
  max_scroll_depth integer not null default 0,
  rage_clicks integer not null default 0,
  js_errors integer not null default 0,
  slow_loads integer not null default 0
);

create index if not exists visitor_sessions_store_started_idx on visitor_sessions (store_id, started_at desc);
create index if not exists visitor_sessions_store_visitor_idx on visitor_sessions (store_id, visitor_id);

create table if not exists visitor_events (
  id uuid primary key,
  store_id text not null references stores(id),
  session_id uuid references visitor_sessions(id) on delete set null,
  visitor_id text,
  event_type text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_store_type_idx on visitor_events (store_id, event_type, created_at desc);

create table if not exists analytics_daily_rollups (
  store_id text not null references stores(id),
  day date not null,
  metrics jsonb not null default '{}'::jsonb,
  primary key (store_id, day)
);
