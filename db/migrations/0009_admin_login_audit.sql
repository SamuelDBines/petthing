create table if not exists admin_login_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_login_events_created_at_idx on admin_login_events (created_at desc);
