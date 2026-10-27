-- Merge legacy wildframe store into fixmonger and remove the duplicate stores row.
-- Idempotent: no-op when wildframe is already absent.
do $migrate$
declare
  wildframe_exists boolean;
begin
  select exists (select 1 from stores where id = 'wildframe') into wildframe_exists;
  if not wildframe_exists then
    return;
  end if;

  if not exists (select 1 from stores where id = 'fixmonger') then
    raise exception '0014: fixmonger store row missing — cannot merge wildframe';
  end if;

  update stores
  set domains = (
    select array(
      select distinct unnest(coalesce(s.domains, '{}') || coalesce(w.domains, '{}'))
    )
    from stores s
    cross join stores w
    where s.id = 'fixmonger' and w.id = 'wildframe'
  )
  where id = 'fixmonger';

  -- Tables with store_id but no FK (or already updated in 0006; safe to repeat).
  update orders set store_id = 'fixmonger' where store_id = 'wildframe';
  update events set store_id = 'fixmonger' where store_id = 'wildframe';
  update preorders set store_id = 'fixmonger' where store_id = 'wildframe';
  update hand_painted_orders set store_id = 'fixmonger' where store_id = 'wildframe';

  -- daily_spend PK (store_id, day): drop wildframe rows that collide with fixmonger.
  delete from daily_spend w
  where w.store_id = 'wildframe'
    and exists (select 1 from daily_spend f where f.store_id = 'fixmonger' and f.day = w.day);
  update daily_spend set store_id = 'fixmonger' where store_id = 'wildframe';

  -- analytics_daily_rollups PK (store_id, day): merge metrics when both exist, else reassign.
  update analytics_daily_rollups f
  set metrics = jsonb_strip_nulls(
    jsonb_build_object(
      'uniqueVisitors', coalesce((f.metrics->>'uniqueVisitors')::int, 0) + coalesce((w.metrics->>'uniqueVisitors')::int, 0),
      'sessions', coalesce((f.metrics->>'sessions')::int, 0) + coalesce((w.metrics->>'sessions')::int, 0),
      'newVisitors', coalesce((f.metrics->>'newVisitors')::int, 0) + coalesce((w.metrics->>'newVisitors')::int, 0),
      'returningVisitors', coalesce((f.metrics->>'returningVisitors')::int, 0) + coalesce((w.metrics->>'returningVisitors')::int, 0),
      'pageviews', coalesce((f.metrics->>'pageviews')::int, 0) + coalesce((w.metrics->>'pageviews')::int, 0),
      'bounceRate',
        case
          when coalesce((f.metrics->>'sessions')::int, 0) + coalesce((w.metrics->>'sessions')::int, 0) = 0 then 0
          else (
            coalesce((f.metrics->>'bounceRate')::numeric, 0) * coalesce((f.metrics->>'sessions')::int, 0)
            + coalesce((w.metrics->>'bounceRate')::numeric, 0) * coalesce((w.metrics->>'sessions')::int, 0)
          ) / (coalesce((f.metrics->>'sessions')::int, 0) + coalesce((w.metrics->>'sessions')::int, 0))
        end,
      'funnel', coalesce(f.metrics->'funnel', '{}'::jsonb) || coalesce(w.metrics->'funnel', '{}'::jsonb),
      'bounceByLanding', coalesce(f.metrics->'bounceByLanding', '{}'::jsonb) || coalesce(w.metrics->'bounceByLanding', '{}'::jsonb),
      'bounceBySource', coalesce(f.metrics->'bounceBySource', '{}'::jsonb) || coalesce(w.metrics->'bounceBySource', '{}'::jsonb),
      'bounceByDevice', coalesce(f.metrics->'bounceByDevice', '{}'::jsonb) || coalesce(w.metrics->'bounceByDevice', '{}'::jsonb),
      'exitPages', coalesce(f.metrics->'exitPages', '{}'::jsonb) || coalesce(w.metrics->'exitPages', '{}'::jsonb),
      'signals', coalesce(f.metrics->'signals', '{}'::jsonb) || coalesce(w.metrics->'signals', '{}'::jsonb)
    )
  )
  from analytics_daily_rollups w
  where f.store_id = 'fixmonger'
    and w.store_id = 'wildframe'
    and f.day = w.day;

  delete from analytics_daily_rollups w
  where w.store_id = 'wildframe'
    and exists (
      select 1 from analytics_daily_rollups f where f.store_id = 'fixmonger' and f.day = w.day
    );

  update analytics_daily_rollups set store_id = 'fixmonger' where store_id = 'wildframe';

  update visitor_sessions set store_id = 'fixmonger' where store_id = 'wildframe';
  update visitor_events set store_id = 'fixmonger' where store_id = 'wildframe';

  update shop_orders set store_id = 'fixmonger' where store_id = 'wildframe';
  update supplier_batch_exports set store_id = 'fixmonger' where store_id = 'wildframe';

  delete from catalogue_products w
  where w.store_id = 'wildframe'
    and exists (select 1 from catalogue_products f where f.store_id = 'fixmonger' and f.id = w.id);
  update catalogue_products set store_id = 'fixmonger' where store_id = 'wildframe';

  delete from app_settings where store_id = 'wildframe';

  delete from stores where id = 'wildframe';
end
$migrate$;
