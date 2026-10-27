alter table shop_orders add column if not exists dispatched_email_sent_at timestamptz;

delete from analytics_daily_rollups r
where r.store_id = 'fixmonger'
  and exists (
    select 1
    from visitor_sessions vs
    where vs.store_id = 'fixmonger'
      and vs.started_at::date = r.day
  );
