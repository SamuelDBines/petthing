-- 0025 jsonb_set on brand.* is a no-op when config has no brand object. Ensure brand exists, then set domain/email (idempotent).
update stores
set config = jsonb_set(
  config,
  '{brand}',
  coalesce(config->'brand', '{}'::jsonb),
  true
)
where id = 'pawtraitry';

update stores
set config = jsonb_set(
  jsonb_set(config, '{brand,siteDomain}', '"pawtraitry.com"', true),
  '{brand,supportEmail}',
  '"hello@pawtraitry.com"',
  true
)
where id = 'pawtraitry'
  and (
    coalesce(config->'brand'->>'siteDomain', '') is distinct from 'pawtraitry.com'
    or coalesce(config->'brand'->>'supportEmail', '') is distinct from 'hello@pawtraitry.com'
  );
