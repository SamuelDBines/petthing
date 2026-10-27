import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { cancelShopOrder, canEditShopShipping } from "../lib/shop/admin-order-actions";

test("canEditShopShipping allows paid and submitted", () => {
  assert.equal(canEditShopShipping({ status: "paid" } as never), true);
  assert.equal(canEditShopShipping({ status: "submitted_to_supplier" } as never), true);
  assert.equal(canEditShopShipping({ status: "shipped" } as never), false);
});

test("cancelShopOrder rejects shipped orders", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const id = randomUUID();
  await store.createShopOrder({
    id,
    storeId: "fixmonger",
    email: "cancel-test@example.com",
    status: "shipped",
    lines: [],
    shipping: null,
    amountPence: 1000,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  });
  await assert.rejects(() => cancelShopOrder(id), /Cannot cancel after dispatch/);
});
