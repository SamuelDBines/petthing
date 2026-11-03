import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.LOCAL_DATA_DIR = mkdtempSync(join(tmpdir(), "petthing-refund-guard-"));
process.env.EMAIL_PROVIDER = "none";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Order } from "../lib/domain";
import { OrderAlreadyRefundedError, refundOrder } from "../lib/fulfillment";
import { refundShopOrder } from "../lib/shop/refunds";
import { jsonStore } from "../lib/store/json";

function deliveredOrder(id: string): Order {
  return {
    id,
    storeId: "pawtraitry",
    createdAt: "2026-01-01T00:00:00.000Z",
    email: "refund-guard@example.com",
    themeId: "halloween",
    subjectType: "pet",
    tierId: "classic",
    styleIds: ["victorian-portrait"],
    cardNames: "",
    status: "delivered",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "demo_refund_guard",
    amountPence: 1999,
    priority: false,
    consentAt: "2026-01-01T00:00:00.000Z",
    digitalSupplyConsentAt: "2026-01-01T00:00:00.000Z",
    utm: {},
    referralCodeUsed: null,
    ownReferralCode: `PAW-RG-${id}`,
    resultsToken: `results-${id}`,
    uploadToken: `upload-${id}`,
    generationCostGbp: 0,
    deliveredAt: null,
    photosDeleteAfter: null,
    resultsDeleteAfter: null,
    ipHash: "",
    uploadsDeletedAt: null,
    resultsDeletedAt: null,
    failureReason: null,
    processedSessions: [],
    referralRewardGranted: false,
    pendingBonusEmail: false,
    offer: "one_off",
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    payments: [],
  };
}

test("refundOrder refuses a second refund of the same order", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(deliveredOrder(id));
  await refundOrder(id);
  assert.equal((await jsonStore.getOrder(id))?.status, "refunded");
  await assert.rejects(() => refundOrder(id), OrderAlreadyRefundedError);
  assert.equal((await jsonStore.getOrder(id))?.status, "refunded");
});

test("refundShopOrder refuses an already-refunded shop order", async () => {
  const id = randomUUID();
  await jsonStore.createShopOrder({
    id,
    storeId: "fixmonger",
    email: "refund-guard-shop@example.com",
    status: "refunded",
    lines: [],
    shipping: null,
    amountPence: 1000,
    amountRefundedPence: 1000,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "demo_refund_guard_shop",
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  });
  await assert.rejects(() => refundShopOrder(id), /already refunded/);
});
