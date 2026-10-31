-- Mirror of db/migrations/0007_jinglefold_store.sql for Supabase deploys.
insert into stores (id, slug, domains, config)
values (
  'jinglefold',
  'jinglefold',
  array['jinglefold.co.uk','www.jinglefold.co.uk','jinglefold.localhost'],
  jsonb_build_object('storeType', 'christmas')
)
on conflict (id) do update set
  slug = excluded.slug,
  domains = excluded.domains,
  config = stores.config || excluded.config;

insert into app_settings (store_id, theme_mode, active_theme_id, sales_paused, queue_halted)
values ('jinglefold', 'manual', 'jinglefold-core', false, false)
on conflict (store_id) do nothing;

alter table orders add column if not exists product_meta jsonb;
