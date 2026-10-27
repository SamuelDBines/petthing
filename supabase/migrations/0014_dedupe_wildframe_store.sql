-- wildframe was renamed to fixmonger; remove duplicate store row so admin lists one Fixmonger.
update stores
set domains = (
  select array(select distinct unnest(coalesce(s.domains, '{}') || coalesce(w.domains, '{}')))
  from stores s
  cross join stores w
  where s.id = 'fixmonger' and w.id = 'wildframe'
)
where id = 'fixmonger' and exists (select 1 from stores where id = 'wildframe');

delete from app_settings where store_id = 'wildframe';
delete from stores where id = 'wildframe';
