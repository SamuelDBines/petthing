-- Fixmonger free UK shipping (0030 skipped when config.catalog was missing).

UPDATE stores
SET config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{catalog}',
  '{}'::jsonb,
  true
)
WHERE id = 'fixmonger'
  AND (config->'catalog' IS NULL OR config->'catalog' = 'null'::jsonb);

UPDATE stores
SET config = jsonb_set(config, '{catalog,freeUkShipping}', 'true'::jsonb, true)
WHERE id = 'fixmonger'
  AND coalesce(config->'catalog'->>'freeUkShipping', 'false') IS DISTINCT FROM 'true';
