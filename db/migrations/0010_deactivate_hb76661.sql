-- HB-76661 clothes airer was marked DROP in pricing seed; remove from live catalogue.
UPDATE catalogue_products
SET active = false, updated_at = NOW()
WHERE store_id = 'fixmonger' AND supplier_sku = 'HB-76661';
