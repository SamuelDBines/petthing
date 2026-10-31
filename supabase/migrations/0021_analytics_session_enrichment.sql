alter table visitor_sessions add column if not exists excluded_from_metrics boolean not null default false;
alter table visitor_sessions add column if not exists exclusion_reason text;
alter table visitor_sessions add column if not exists referrer_domain text;
alter table visitor_sessions add column if not exists browser text;
alter table visitor_sessions add column if not exists gclid text;
alter table visitor_sessions add column if not exists fbclid text;
alter table visitor_sessions add column if not exists ttclid text;
alter table visitor_sessions add column if not exists had_interaction boolean not null default false;
alter table visitor_sessions add column if not exists user_agent text;

create index if not exists visitor_sessions_store_started_excluded_idx
  on visitor_sessions (store_id, started_at, excluded_from_metrics);
