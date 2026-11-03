create table if not exists email_signups (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  email text not null,
  source text not null,
  name text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  visitor_session_id uuid,
  excluded_from_metrics boolean not null default false,
  unsubscribed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_signups_email_lower_idx on email_signups (lower(email));
create index if not exists email_signups_store_created_idx on email_signups (store_id, created_at desc);
create index if not exists email_signups_source_created_idx on email_signups (source, created_at desc);
