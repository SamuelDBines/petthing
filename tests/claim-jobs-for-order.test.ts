import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import test from "node:test";
import type { Job, Order } from "../lib/domain";
import { jsonStore } from "../lib/store/json";

function portraitOrder(id: string): Order {
  return {
    id,
    storeId: "pawtraitry",
    createdAt: "2026-01-01T00:00:00.000Z",
    email: "a@example.com",
    themeId: "halloween",
    subjectType: "pet",
    tierId: "classic",
    styleIds: ["victorian-portrait"],
    cardNames: "",
    status: "generating",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: 1999,
    priority: false,
    consentAt: "2026-01-01T00:00:00.000Z",
    digitalSupplyConsentAt: "2026-01-01T00:00:00.000Z",
    utm: {},
    referralCodeUsed: null,
    ownReferralCode: "PAW-TEST99",
    resultsToken: "results",
    uploadToken: "upload",
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

function queuedJob(id: string, order: string, variantIndex: number): Job {
  return {
    id,
    orderId: order,
    styleId: "victorian-portrait",
    variantIndex,
    status: "queued",
    attempts: 0,
    providerRequestId: null,
    lastError: null,
    costGbp: 0,
    priority: false,
    lockedUntil: null,
    nextRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("claimJobsForOrder only claims jobs for that order", async () => {
  const orderId = randomUUID();
  const otherId = randomUUID();
  await jsonStore.createOrder(portraitOrder(orderId));
  await jsonStore.createOrder({ ...portraitOrder(otherId), ownReferralCode: "PAW-OTHER" });
  await jsonStore.addJobs([
    queuedJob(randomUUID(), orderId, 0),
    queuedJob(randomUUID(), orderId, 1),
    queuedJob(randomUUID(), otherId, 0),
  ]);
  const claimed = await jsonStore.claimJobsForOrder(orderId, 6);
  assert.equal(claimed.length, 2);
  assert.ok(claimed.every((job) => job.orderId === orderId));
  assert.equal(claimed[0]?.status, "running");
});
