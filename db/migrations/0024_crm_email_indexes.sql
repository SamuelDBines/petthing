create index if not exists orders_email_lower_idx on orders (lower(email));
create index if not exists shop_orders_email_lower_idx on shop_orders (lower(email));
create index if not exists preorders_email_lower_idx on preorders (lower(email));
