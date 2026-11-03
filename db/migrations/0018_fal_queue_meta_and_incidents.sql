alter table jobs add column if not exists provider_meta jsonb;

alter table orders add column if not exists fal_paid_submits integer not null default 0;

create table if not exists fal_provider_incidents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status integer not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists fal_provider_incidents_created_at_idx
  on fal_provider_incidents (created_at desc);
