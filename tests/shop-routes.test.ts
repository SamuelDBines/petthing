import assert from "node:assert/strict";
import test from "node:test";
import { isShopReservedSegment, should404UnknownShopProduct } from "../lib/catalogue/shop-routes";

test("reserved shop routes are not 404", () => {
  assert.equal(isShopReservedSegment("cart"), true);
  assert.equal(isShopReservedSegment("success"), true);
  assert.equal(should404UnknownShopProduct("fixmonger", "cart", false), false);
  assert.equal(should404UnknownShopProduct("fixmonger", "bogus-slug", false), true);
});
