import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIXMONGER_SEED_PRODUCTS } from "../config/catalogue/fixmonger-seed";

test("ProductCard links to /shop slug path", () => {
  const source = readFileSync(new URL("../components/shop/product-card.tsx", import.meta.url), "utf8");
  assert.match(source, /const href = `\/shop\/\$\{product\.slug\}`/);
  assert.match(source, /data-testid="product-card-link"/);
  const sample = FIXMONGER_SEED_PRODUCTS[0];
  assert.ok(sample?.slug, "seed product needs slug");
  assert.match(source, /pointer-events-auto/);
});
