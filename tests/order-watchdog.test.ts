import assert from "node:assert/strict";
import test from "node:test";
import { alertStuckShopOrders, findStuckShopOrders, isRealShopOrder } from "../lib/ops/order-watchdog";
import { randomUUID } from "node:crypto";

process.env.LIVE_STORES = "fixmonger";

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
    stripeLivemode: true,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: old,
    paidAt: old,
  });
  const { paidStuck } = await findStuckShopOrders("fixmonger");
  assert.ok(paidStuck.some((o) => o.email === "stuck@example.com"));
});

function stuckOrder(over: Record<string, unknown>) {
  const old = new Date(Date.now() - 8 * 3_600_000).toISOString();
  return {
    id: randomUUID(),
    storeId: "fixmonger",
    email: `real-${randomUUID()}@example.com`,
    status: "paid" as const,
    lines: [
      { productId: "x", name: "T", supplierSku: "X", supplier: "go_dropship" as const, quantity: 1, unitPricePence: 1000, costPence: 500 },
    ],
    shipping: null,
    amountPence: 1000,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "pi_x",
    stripeLivemode: true,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: old,
    paidAt: old,
    ...over,
  };
}

test("findStuckShopOrders skips test-mode, QA email and non-live stores", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const testMode = stuckOrder({ stripeLivemode: false });
  const qa = stuckOrder({ email: `qa-${randomUUID()}@pawtraitry.test` });
  const notLive = stuckOrder({ storeId: "jinglefold" });
  for (const o of [testMode, qa, notLive]) await store.createShopOrder(o);
  const { paidStuck } = await findStuckShopOrders();
  const ids = new Set(paidStuck.map((o) => o.id));
  assert.ok(!ids.has(testMode.id));
  assert.ok(!ids.has(qa.id));
  assert.ok(!ids.has(notLive.id));
});

test("isRealShopOrder", () => {
  const env = { LIVE_STORES: "pawtraitry" } as unknown as NodeJS.ProcessEnv;
  const base = stuckOrder({ storeId: "pawtraitry" }) as never;
  assert.equal(isRealShopOrder(base, env), true);
  assert.equal(isRealShopOrder({ ...(base as object), stripeLivemode: false } as never, env), false);
  assert.equal(isRealShopOrder({ ...(base as object), email: "a@pawtraitry.test" } as never, env), false);
  assert.equal(isRealShopOrder({ ...(base as object), storeId: "fixmonger" } as never, env), false);
});

test("alertStuckShopOrders alerts an order at most once per 24h", async () => {
  const { getStore } = await import("../lib/store");
  const store = getStore();
  const o = stuckOrder({});
  await store.createShopOrder(o);
  await alertStuckShopOrders();
  const after1 = await store.getShopOrder(o.id);
  assert.ok(after1?.stuckAlertSentAt);
  const r2 = await alertStuckShopOrders();
  const after2 = await store.getShopOrder(o.id);
  assert.equal(after2?.stuckAlertSentAt, after1?.stuckAlertSentAt);
  assert.equal(r2.alerted, 0);
  const old = new Date(Date.now() - 25 * 3_600_000).toISOString();
  await store.updateShopOrder(o.id, { stuckAlertSentAt: old });
  const r3 = await alertStuckShopOrders();
  assert.ok(r3.alerted >= 1);
});
