-- Canonical Pawtraitry domain is pawtraitry.com (not .co.uk).
update stores
set domains = (
  select coalesce(array_agg(
    case
      when d = 'pawtraitry.co.uk' then 'pawtraitry.com'
      when d = 'www.pawtraitry.co.uk' then 'www.pawtraitry.com'
      else d
    end
  ), '{}'::text[])
  from unnest(domains) as d
)
where id = 'pawtraitry';

update stores
set config = jsonb_set(
  jsonb_set(config, '{brand,siteDomain}', '"pawtraitry.com"', true),
  '{brand,supportEmail}',
  '"hello@pawtraitry.com"',
  true
)
where id = 'pawtraitry';
