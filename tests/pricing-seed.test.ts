import test from "node:test";
import assert from "node:assert/strict";
import { FIXMONGER_SEED_PRODUCTS } from "../config/catalogue/fixmonger-seed";
import { fixmongerShippingPence, recommendedPence } from "../config/catalogue/pricing-seed";
import { shopOrderLinesForProduct } from "../lib/catalogue/order-lines";
import { toStorefrontProduct } from "../lib/catalogue/storefront";
import { TIERS } from "../config/pricing";
import { pawtraitryPrintPricePence } from "../config/catalogue/pawtraitry-skus";

test("Fixmonger seed drops HB-76661 and includes kits at seed prices", () => {
  const skus = FIXMONGER_SEED_PRODUCTS.map((p) => p.supplierSku);
  assert.equal(skus.includes("HB-76661"), false);
  assert.equal(skus.includes("FX-KIT-CAR"), true);
  assert.equal(recommendedPence("Fixmonger", "FX-KIT-CAR"), 2499);
  assert.equal(recommendedPence("Fixmonger", "FX-KIT-DOOR"), 3499);
  assert.equal(recommendedPence("Fixmonger", "FX-KIT-GARDEN"), 4499);
  const carKit = FIXMONGER_SEED_PRODUCTS.find((p) => p.supplierSku === "FX-KIT-CAR");
  assert.ok(carKit?.compareAtPricePence === 2798);
});

test("bundle checkout lines expand to supplier SKUs", () => {
  const kit = FIXMONGER_SEED_PRODUCTS.find((p) => p.supplierSku === "FX-KIT-CAR");
  assert.ok(kit);
  const lines = shopOrderLinesForProduct(kit!, 1);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines.map((l) => l.supplierSku).sort(), ["AB6701", "CAR-46787"]);
});

test("storefront products omit cost fields", () => {
  const product = FIXMONGER_SEED_PRODUCTS[0];
  const storefront = toStorefrontProduct(product);
  assert.equal("costPence" in storefront, false);
  assert.equal("bundleComponents" in storefront, false);
});

test("Fixmonger shipping is free from £20 subtotal", () => {
  assert.equal(fixmongerShippingPence(1999), 299);
  assert.equal(fixmongerShippingPence(2000), 0);
});

test("Pawtraitry digital tiers use recommended_price from seed", () => {
  const mini = TIERS.find((t) => t.id === "mini");
  const classic = TIERS.find((t) => t.id === "classic");
  assert.equal(mini?.pricePence, 999);
  assert.equal(classic?.pricePence, 1499);
  assert.equal(classic?.compareAtPricePence, 2997);
});

test("Pawtraitry print prices include delivery in list price", () => {
  assert.equal(pawtraitryPrintPricePence("puzzle_252"), 4199);
  assert.equal(pawtraitryPrintPricePence("canvas_stretched_24x32"), 12599);
});
