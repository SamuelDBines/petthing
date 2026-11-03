import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.LOCAL_DATA_DIR = mkdtempSync(join(tmpdir(), "petthing-shop-admin-"));
process.env.EMAIL_PROVIDER = "none";

import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  cancelShopOrder,
  canEditShopShipping,
  shopOrderRefundablePence,
} from "../lib/shop/admin-order-actions";

/** Avoid real SES/Relay sends when AWS or mail env is configured on the runner. */
test.beforeEach(() => {
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.AWS_SES_REGION;
  delete process.env.RELAYEMAIL_API_KEY;
});

test("canEditShopShipping allows paid and submitted", () => {
  assert.equal(canEditShopShipping({ status: "paid" } as never), true);
  assert.equal(canEditShopShipping({ status: "submitted_to_supplier" } as never), true);
  assert.equal(canEditShopShipping({ status: "shipped" } as never), false);
});

test("cancelShopOrder rejects shipped orders without confirm flag", async () => {
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
  await assert.rejects(() => cancelShopOrder(id), /confirmShippedCancel/);
});

test("shopOrderRefundablePence includes submitted_to_supplier", () => {
  const pence = shopOrderRefundablePence({
    status: "submitted_to_supplier",
    paidAt: new Date().toISOString(),
    amountPence: 2500,
    amountRefundedPence: 0,
  } as never);
  assert.equal(pence, 2500);
});

test("cancelShopOrder refunds submitted_to_supplier and flags supplier cancel", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const id = randomUUID();
  const batchId = randomUUID();
  await store.createShopOrder({
    id,
    storeId: "fixmonger",
    email: "submitted-cancel@example.com",
    status: "submitted_to_supplier",
    lines: [],
    shipping: null,
    amountPence: 3200,
    shippingPence: 0,
    stripeCheckoutSessionId: "sess_test",
    stripePaymentIntentId: "demo_test_intent",
    trackingNumber: null,
    supplierBatchId: batchId,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  });
  const updated = await cancelShopOrder(id);
  assert.ok(updated);
  assert.equal(updated.status, "refunded");
  assert.equal(updated.amountRefundedPence, 3200);
  assert.ok(updated.supplierCancelRequestedAt);
});

test("cancelShopOrder cancels pending checkout without refund", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const id = randomUUID();
  await store.createShopOrder({
    id,
    storeId: "fixmonger",
    email: "pending-cancel@example.com",
    status: "pending_payment",
    lines: [],
    shipping: null,
    amountPence: 1500,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  });
  const updated = await cancelShopOrder(id, { refund: false });
  assert.ok(updated);
  assert.equal(updated.status, "cancelled");
});
