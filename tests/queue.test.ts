import assert from "node:assert/strict";
import test from "node:test";
import type { Job, Order } from "../lib/domain";
import { jobIsClaimable, LOCK_MS, retryDelayMs } from "../lib/queue";

function order(): Order {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    storeId: "pawtraitry",
    createdAt: "2026-10-18T12:00:00.000Z",
    email: "a@example.com",
    themeId: "halloween",
    subjectType: "pet",
    tierId: "mini",
    styleIds: ["victorian-portrait"],
    cardNames: "",
    status: "paid",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: 599,
    priority: false,
    consentAt: "2026-10-18T12:00:00.000Z",
    digitalSupplyConsentAt: "2026-10-18T12:00:00.000Z",
    utm: {},
    referralCodeUsed: null,
    ownReferralCode: "PAW-TEST01",
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

function job(patch: Partial<Job> = {}): Job {
  return {
    id: "00000000-0000-4000-8000-000000000011",
    orderId: order().id,
    styleId: "victorian-portrait",
    variantIndex: 0,
    status: "queued",
    attempts: 0,
    providerRequestId: null,
    lastError: null,
    costGbp: 0,
    priority: false,
    lockedUntil: null,
    nextRunAt: null,
    createdAt: "2026-10-18T12:00:00.000Z",
    updatedAt: "2026-10-18T12:00:00.000Z",
    ...patch,
  };
}

const now = Date.parse("2026-10-18T12:10:00.000Z");

test("a queued job is claimable and a future retry is not", () => {
  assert.equal(jobIsClaimable(job(), order(), now), true);
  assert.equal(jobIsClaimable(job({ nextRunAt: "2026-10-18T12:20:00.000Z" }), order(), now), false);
  assert.equal(jobIsClaimable(job({ nextRunAt: "2026-10-18T12:00:00.000Z" }), order(), now), true);
});

test("a locked running job stays with its worker until the lock expires", () => {
  assert.equal(jobIsClaimable(job({ status: "running", lockedUntil: "2026-10-18T12:15:00.000Z" }), order(), now), false);
  assert.equal(jobIsClaimable(job({ status: "submitted", lockedUntil: "2026-10-18T12:05:00.000Z" }), order(), now), true);
  const fresh = job({ status: "running", lockedUntil: null, updatedAt: new Date(now - 1000).toISOString() });
  assert.equal(jobIsClaimable(fresh, order(), now), false);
  const stale = job({ status: "running", lockedUntil: null, updatedAt: new Date(now - LOCK_MS - 1000).toISOString() });
  assert.equal(jobIsClaimable(stale, order(), now), true);
});

test("finished, dead, and unpaid work is not claimed", () => {
  assert.equal(jobIsClaimable(job({ status: "done" }), order(), now), false);
  assert.equal(jobIsClaimable(job({ status: "dead" }), order(), now), false);
  assert.equal(jobIsClaimable(job(), { ...order(), status: "pending_payment" }, now), false);
  assert.equal(jobIsClaimable(job(), { ...order(), status: "refunded" }, now), false);
});

test("retry delay doubles and then caps", () => {
  assert.equal(retryDelayMs(1), 15_000);
  assert.equal(retryDelayMs(2), 30_000);
  assert.equal(retryDelayMs(3), 60_000);
  assert.equal(retryDelayMs(10), 15 * 60 * 1000);
});
