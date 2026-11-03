create table if not exists email_suppressions (
  email text primary key,
  reason text not null,
  detail text,
  suppressed_at timestamptz not null default now()
);
