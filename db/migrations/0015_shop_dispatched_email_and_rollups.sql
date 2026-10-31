-- Dispatched email guard + repair analytics after wildframe merge.
alter table shop_orders add column if not exists dispatched_email_sent_at timestamptz;

-- Rows merged incorrectly in early 0014 builds cannot be fixed in SQL; rebuild from visitor_sessions/events.
-- Run after migrate: npm run rebuild:rollups
-- Optional admin: POST /api/admin/analytics/rebuild-rollups

delete from analytics_daily_rollups r
where r.store_id = 'fixmonger'
  and exists (
    select 1
    from visitor_sessions vs
    where vs.store_id = 'fixmonger'
      and vs.started_at::date = r.day
  );
