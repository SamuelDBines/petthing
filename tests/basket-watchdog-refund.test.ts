import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.LOCAL_DATA_DIR = mkdtempSync(join(tmpdir(), "pt-basket-watchdog-"));
process.env.EMAIL_PROVIDER = "none";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Order, PrintOrder } from "../lib/domain";
import { existingBasketPrintUnits, isRefundedPrint } from "../lib/pawtraitry/basket-fulfillment";
import { refundStuckPaidPrintsWithoutProdigi } from "../lib/pawtraitry/basket-fulfilment-runner";
import { jsonStore } from "../lib/store/json";

function stuckOrder(id: string): Order {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 2 * 3_600_000).toISOString();
  return {
    id, storeId: "pawtraitry", createdAt: now, email: "stuck-basket@example.com", themeId: "studio", subjectType: "pet",
    tierId: "digital_pack", styleIds: ["oil"], cardNames: "", status: "delivered", stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test", amountPence: 2598, priority: false, consentAt: now, digitalSupplyConsentAt: now, utm: {},
    referralCodeUsed: null, ownReferralCode: `PAW-WD-${id}`, resultsToken: `r-${id}`, uploadToken: `u-${id}`,
    generationCostGbp: 0, deliveredAt: now, photosDeleteAfter: null, resultsDeleteAfter: null, ipHash: "",
    uploadsDeletedAt: null, resultsDeletedAt: null, failureReason: null, processedSessions: [], referralRewardGranted: false,
    pendingBonusEmail: false, offer: "one_off", stripeSubscriptionId: null, subscriptionStatus: null, payments: [],
    productMeta: {
      checkoutBasket: { physical: [{ productId: "mug_11oz_white", quantity: 2 }] },
      basketFulfilment: { status: "running", requestedAt: old, claimedAt: old, lastError: null },
    } as Order["productMeta"],
  };
}

function paidPrint(orderId: string): PrintOrder {
  return {
    id: randomUUID(), orderId, productId: "mug_11oz_white", assetId: "a", stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test", prodigiOrderId: null, status: "paid", shipping: null, error: null,
    createdAt: new Date().toISOString(),
  };
}

test("timed-out basket lines: refund the unsent one, adopt the one Prodigi already has", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(stuckOrder(id));
  const sent = paidPrint(id);
  const lost = paidPrint(id);
  await jsonStore.addPrint(sent);
  await jsonStore.addPrint(lost);
  const refunds: number[] = [];
  const order = (await jsonStore.getOrder(id))!;
  const count = await refundStuckPaidPrintsWithoutProdigi(order, {
    lookup: async (ref) => (ref === sent.id ? { prodigiOrderId: "ord_123" } : null),
    refund: async (_o, amount) => { refunds.push(amount); },
  });
  assert.equal(count, 1);
  assert.equal(refunds.length, 1);
  const rows = await jsonStore.listPrints(id);
  const adopted = rows.find((r) => r.id === sent.id)!;
  const refunded = rows.find((r) => r.id === lost.id)!;
  assert.equal(adopted.status, "submitted");
  assert.equal(adopted.prodigiOrderId, "ord_123");
  assert.ok(isRefundedPrint(refunded));
  // Both units now count as handled, so the basket runner never re-orders either.
  assert.equal(existingBasketPrintUnits(rows, "mug_11oz_white"), 2);

  // Second watchdog pass is a no-op: no second refund.
  const again = await refundStuckPaidPrintsWithoutProdigi((await jsonStore.getOrder(id))!, {
    lookup: async () => null,
    refund: async (_o, amount) => { refunds.push(amount); },
  });
  assert.equal(again, 0);
  assert.equal(refunds.length, 1);
});

test("Prodigi lookup failure: no refund, line stays counted (no re-order)", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(stuckOrder(id));
  const print = paidPrint(id);
  await jsonStore.addPrint(print);
  let refunded = false;
  const count = await refundStuckPaidPrintsWithoutProdigi((await jsonStore.getOrder(id))!, {
    lookup: async () => { throw new Error("Prodigi down"); },
    refund: async () => { refunded = true; },
  });
  assert.equal(count, 0);
  assert.equal(refunded, false);
  const rows = await jsonStore.listPrints(id);
  assert.equal(rows[0].status, "paid");
  assert.equal(existingBasketPrintUnits(rows, "mug_11oz_white"), 1);
});

test("plain failed (unrefunded) rows are not counted, refunded ones are", () => {
  const base = paidPrint("o");
  const rows: PrintOrder[] = [
    { ...base, id: "1", status: "failed", error: "Prodigi 500" },
    { ...base, id: "2", status: "failed", error: "refunded: fulfilment timeout" },
  ];
  assert.equal(existingBasketPrintUnits(rows, "mug_11oz_white"), 1);
});
