alter table app_settings add column if not exists fal_credit_exhausted_since text;
alter table app_settings add column if not exists fal_credit_alert_sent_at text;
