-- Per-store brand.email for Relay/SES From addresses (idempotent).
UPDATE stores
SET config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{brand,email}',
  coalesce(
    config->'brand'->'email',
    CASE id
      WHEN 'pawtraitry' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Pawtraitry"}'::jsonb
      WHEN 'fixmonger' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Fixmonger","placeholderSender":true}'::jsonb
      WHEN 'jinglefold' THEN '{"domain":"pawtraitry.com","ordersLocal":"orders","helloLocal":"hello","fromName":"Jinglefold","placeholderSender":true}'::jsonb
      ELSE '{}'::jsonb
    END
  ),
  true
)
WHERE id IN ('pawtraitry', 'fixmonger', 'jinglefold')
  AND (
    config->'brand'->'email' IS NULL
    OR config->'brand'->'email' = 'null'::jsonb
  );
