import test from "node:test";
import assert from "node:assert/strict";
import { JINGLEFOLD_BUNDLE_COMPONENTS } from "../config/catalogue/jinglefold-bundles";
import { JINGLEFOLD_DECOR_PRODUCTS } from "../config/catalogue/jinglefold-seed";
import { jinglefoldShippingPence } from "../config/jinglefold";

test("Jinglefold decor excludes DROP and solar SKUs", () => {
  const skus = JINGLEFOLD_DECOR_PRODUCTS.map((p) => p.supplierSku);
  assert.equal(skus.includes("GEM-76737"), false);
  assert.equal(skus.includes("EPG-75516"), false);
  assert.equal(skus.includes("HB-76392"), false);
  assert.ok(skus.includes("XM-KIT-TREE"));
});

test("XM-KIT-TREE bundle includes glitter reindeer SKU", () => {
  const parts = JINGLEFOLD_BUNDLE_COMPONENTS["XM-KIT-TREE"]?.map((c) => c.supplierSku) ?? [];
  assert.deepEqual(parts.sort(), ["GEM-76745", "GEM-76752", "GEM-76758"]);
});

test("Jinglefold shipping free from £30", () => {
  assert.equal(jinglefoldShippingPence(2999), 299);
  assert.equal(jinglefoldShippingPence(3000), 0);
});

test("scented candle has CLP text", () => {
  const candle = JINGLEFOLD_DECOR_PRODUCTS.find((p) => p.supplierSku === "GEM-76735");
  assert.ok(candle?.clpSafetyText?.includes("CLP"));
});
