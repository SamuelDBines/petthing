-- HB-76661 clothes airer was marked DROP in pricing seed; remove from live catalogue.
UPDATE catalogue_products
SET active = false
WHERE store_id = 'fixmonger' AND supplier_sku = 'HB-76661';
