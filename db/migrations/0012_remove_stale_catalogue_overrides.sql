-- Early fixmonger migration rows override code-seeded catalogue (wrong price/copy).
-- Safe: shop orders reference product_id + snapshot at checkout; removing overrides restores seed.
delete from catalogue_products
where store_id = 'fixmonger'
  and id in ('hom-76459', 'car-46787', 'hom-74935', 'hb-76661');
