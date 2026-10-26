alter table orders
  add column if not exists digital_supply_consent_at timestamptz;
