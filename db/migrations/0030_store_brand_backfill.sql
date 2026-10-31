-- Backfill missing config.brand (0027/0028 jsonb_set on brand.* skipped rows without a brand object).

UPDATE stores
SET config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{brand}',
  '{}'::jsonb,
  true
)
WHERE id IN ('pawtraitry', 'fixmonger', 'jinglefold')
  AND (config->'brand' IS NULL OR config->'brand' = 'null'::jsonb);

UPDATE stores
SET config = jsonb_set(
  config,
  '{brand,email}',
  CASE id
    WHEN 'pawtraitry' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Pawtraitry"}'::jsonb
    WHEN 'fixmonger' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Fixmonger","placeholderSender":true}'::jsonb
    WHEN 'jinglefold' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Jinglefold","placeholderSender":true}'::jsonb
    ELSE '{}'::jsonb
  END,
  true
)
WHERE id IN ('pawtraitry', 'fixmonger', 'jinglefold')
  AND (config->'brand'->'email' IS NULL OR config->'brand'->'email' = 'null'::jsonb);

UPDATE stores
SET config = jsonb_set(
  jsonb_set(
    config,
    '{brand,tagline}',
    '"Keep windows open: pets in, bugs out, all year."'::jsonb,
    true
  ),
  '{catalog,freeUkShipping}',
  'true'::jsonb,
  true
)
WHERE id = 'fixmonger'
  AND (
    config->'brand'->>'tagline' IS DISTINCT FROM 'Keep windows open: pets in, bugs out, all year.'
    OR coalesce(config->'catalog'->>'freeUkShipping', 'false') IS DISTINCT FROM 'true'
  );
