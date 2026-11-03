-- Fixmonger catalogue, hand-painted workflow, migrate wildframe -> fixmonger (additive).

insert into stores (id, slug, domains, config)
values (
  'fixmonger',
  'fixmonger',
  array['fixmonger.co.uk','www.fixmonger.co.uk','fixmonger.com','www.fixmonger.com','fixmonger.localhost','wildframe.localhost','wildframe.studio','www.wildframe.studio'],
  jsonb_build_object('storeType', 'catalogue')
)
on conflict (id) do update set
  slug = excluded.slug,
  domains = excluded.domains,
  config = stores.config || excluded.config;

insert into app_settings (store_id, theme_mode, active_theme_id, sales_paused, queue_halted)
values ('fixmonger', 'manual', 'fixmonger-core', false, false)
on conflict (store_id) do nothing;

update orders set store_id = 'fixmonger' where store_id = 'wildframe';
update events set store_id = 'fixmonger' where store_id = 'wildframe';
update preorders set store_id = 'fixmonger' where store_id = 'wildframe';
update daily_spend set store_id = 'fixmonger' where store_id = 'wildframe';
update visitor_sessions set store_id = 'fixmonger' where store_id = 'wildframe';
update visitor_events set store_id = 'fixmonger' where store_id = 'wildframe';

create table if not exists catalogue_products (
  id text not null,
  store_id text not null references stores(id),
  slug text not null,
  name text not null,
  category text not null default 'general',
  description text not null default '',
  supplier text not null default 'go_dropship',
  supplier_sku text not null,
  cost_pence integer not null,
  price_pence integer not null,
  stock integer not null default 0,
  images jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id, id)
);

create table if not exists shop_orders (
  id uuid primary key,
  store_id text not null references stores(id),
  email text not null,
  status text not null,
  lines jsonb not null,
  shipping jsonb,
  amount_pence integer not null,
  shipping_pence integer not null default 0,
  stripe_checkout_session_id text,
  tracking_number text,
  supplier_batch_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists shop_orders_store_created_idx on shop_orders (store_id, created_at desc);

create table if not exists supplier_batch_exports (
  id uuid primary key,
  store_id text not null references stores(id),
  supplier text not null,
  order_ids uuid[] not null,
  csv text not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists hand_painted_orders (
  order_id uuid primary key references orders(id) on delete cascade,
  store_id text not null,
  status text not null default 'awaiting_admin',
  size_label text not null,
  customer_notes text not null default '',
  supplier_email_draft text not null default '',
  proof_token text not null unique,
  proof_asset_url text,
  tracking_number text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists hand_painted_store_status_idx on hand_painted_orders (store_id, status);

insert into catalogue_products (id, store_id, slug, name, category, description, supplier, supplier_sku, cost_pence, price_pence, stock, images)
values
  ('hom-76459', 'fixmonger', 'magnetic-thermal-door-curtain', 'Magnetic thermal door curtain', 'winter',
   'Keeps the draught out without wrestling with a door strip every time the dog wants in.', 'go_dropship', 'HOM-76459', 1199, 2999, 50, '["/stores/fixmonger/placeholder-door-curtain.svg"]'::jsonb),
  ('car-46787', 'fixmonger', 'windscreen-frost-cover', 'Windscreen frost cover', 'winter',
   'Stop scraping at 6am. Elastic hooks, fits most hatchbacks and estates.', 'go_dropship', 'CAR-46787', 399, 1299, 80, '["/stores/fixmonger/placeholder-frost-cover.svg"]'::jsonb),
  ('hom-74935', 'fixmonger', '5-in-1-snow-brush-kit', '5-in-1 snow brush kit', 'winter',
   'Brush, scraper, squeegee, and extendable handle.', 'go_dropship', 'HOM-74935', 1041, 2499, 40, '["/stores/fixmonger/placeholder-snow-brush.svg"]'::jsonb),
  ('hb-76661', 'fixmonger', 'folding-clothes-airer', 'Folding clothes airer', 'winter',
   'When the radiators are full and the tumble dryer costs a fortune.', 'go_dropship', 'HB-76661', 1228, 3299, 35, '["/stores/fixmonger/placeholder-airer.svg"]'::jsonb)
on conflict (store_id, id) do nothing;
