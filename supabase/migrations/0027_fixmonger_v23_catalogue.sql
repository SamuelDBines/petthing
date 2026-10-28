-- Fixmonger v23: deactivate off-niche SKUs (idempotent, fixmonger only).
UPDATE catalogue_products
SET active = false
WHERE store_id = 'fixmonger'
  AND supplier_sku IN (
    'CAR-46787','HOM-62916','HOM-74935','AB6701','HB-76661','HOM-56098','HOM-55115',
    'GEM-76744','CAR-63366','CAR-76112','CAR-75067','HB-75865','FX-KIT-CAR','FX-KIT-GARDEN'
  )
  AND active IS DISTINCT FROM false;

UPDATE stores
SET config = jsonb_set(
  jsonb_set(
    coalesce(config, '{}'::jsonb),
    '{brand,tagline}',
    '"Keep windows open — pets in, bugs out, all year."'::jsonb,
    true
  ),
  '{catalog,freeUkShipping}',
  'true'::jsonb,
  true
)
WHERE id = 'fixmonger'
  AND (
    config->'brand'->>'tagline' IS DISTINCT FROM 'Keep windows open — pets in, bugs out, all year.'
    OR coalesce(config->'catalog'->>'freeUkShipping', 'false') IS DISTINCT FROM 'true'
  );
