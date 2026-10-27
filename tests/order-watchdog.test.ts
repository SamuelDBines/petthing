import assert from "node:assert/strict";
import test from "node:test";
import { findStuckShopOrders } from "../lib/ops/order-watchdog";
import { randomUUID } from "node:crypto";

test("findStuckShopOrders finds old paid go_dropship orders", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const old = new Date(Date.now() - 8 * 3_600_000).toISOString();
  await store.createShopOrder({
    id: randomUUID(),
    storeId: "fixmonger",
    email: "stuck@example.com",
    status: "paid",
    lines: [
      {
        productId: "x",
        name: "Test",
        supplierSku: "X",
        supplier: "go_dropship",
        quantity: 1,
        unitPricePence: 1000,
        costPence: 500,
      },
    ],
    shipping: null,
    amountPence: 1000,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "pi_test",
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: old,
    paidAt: old,
  });
  const { paidStuck } = await findStuckShopOrders("fixmonger");
  assert.ok(paidStuck.some((o) => o.email === "stuck@example.com"));
});
