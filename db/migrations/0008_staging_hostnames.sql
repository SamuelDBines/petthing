-- Staging ingress hostnames (additive; production domains unchanged).

update stores
set domains = (
  select array_agg(distinct d)
  from unnest(domains || array[
    'dropship.store.bishop-co-tech.co.uk',
    'www.dropship.store.bishop-co-tech.co.uk'
  ]::text[]) as d
)
where id = 'pawtraitry';

update stores
set domains = (
  select array_agg(distinct d)
  from unnest(domains || array[
    'fixmonger.dropship.store.bishop-co-tech.co.uk',
    'wildframe.dropship.store.bishop-co-tech.co.uk'
  ]::text[]) as d
)
where id = 'fixmonger';

update stores
set domains = (
  select array_agg(distinct d)
  from unnest(domains || array['jinglefold.dropship.store.bishop-co-tech.co.uk']::text[]) as d
)
where id = 'jinglefold';
