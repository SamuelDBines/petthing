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

  update orders set store_id = 'fixmonger' where store_id = 'wildframe';
  update events set store_id = 'fixmonger' where store_id = 'wildframe';
  update preorders set store_id = 'fixmonger' where store_id = 'wildframe';
  update hand_painted_orders set store_id = 'fixmonger' where store_id = 'wildframe';

  delete from daily_spend w
  where w.store_id = 'wildframe'
    and exists (select 1 from daily_spend f where f.store_id = 'fixmonger' and f.day = w.day);
  update daily_spend set store_id = 'fixmonger' where store_id = 'wildframe';

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
