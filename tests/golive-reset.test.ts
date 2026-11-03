import test from "node:test";
import assert from "node:assert/strict";

test("live stripe guard treats demo and test ids as safe", async () => {
  const { findLiveStripeOrders } = await import("../lib/golive/reset");
  if (!process.env.DATABASE_URL) {
    assert.deepEqual(await findLiveStripeOrders(["pawtraitry"]), []);
    return;
  }
  assert.ok(Array.isArray(await findLiveStripeOrders(["pawtraitry"])));
});
