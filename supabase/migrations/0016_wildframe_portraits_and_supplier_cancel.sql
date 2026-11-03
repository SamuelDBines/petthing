update orders
set store_id = 'pawtraitry'
where store_id = 'fixmonger';

update events e
set store_id = 'pawtraitry'
where e.store_id = 'fixmonger'
  and e.order_id is not null
  and exists (select 1 from orders o where o.id = e.order_id and o.store_id = 'pawtraitry');

alter table shop_orders add column if not exists supplier_cancel_requested_at timestamptz;
