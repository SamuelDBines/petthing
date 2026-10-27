import assert from "node:assert/strict";
import test from "node:test";
import { getCatalogueProduct } from "../lib/catalogue/products";

test("unknown catalogue slug resolves to null (PDP should 404)", async () => {
  const product = await getCatalogueProduct("fixmonger", "this-product-does-not-exist-xyz");
  assert.equal(product, null);
});
