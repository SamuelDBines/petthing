import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Order } from "../lib/domain";
import {
  clearFalCreditExhaustedState,
  markFalCreditExhausted,
  resumeWaitingForCreditOrders,
} from "../lib/fal/credit-ops";
import { jsonStore } from "../lib/store/json";

function portraitOrder(id: string, status: Order["status"]): Order {
  return {
    id,
    storeId: "pawtraitry",
    createdAt: "2026-01-01T00:00:00.000Z",
    email: "fal-credit@example.com",
    themeId: "halloween",
    subjectType: "pet",
    tierId: "mini",
    styleIds: ["victorian-portrait"],
    cardNames: "",
    status,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "demo_fal",
    amountPence: 999,
    priority: false,
    consentAt: "2026-01-01T00:00:00.000Z",
    digitalSupplyConsentAt: "2026-01-01T00:00:00.000Z",
    utm: {},
    referralCodeUsed: null,
    ownReferralCode: "PAW-TEST",
    resultsToken: "tok",
    uploadToken: "up",
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

test("resumeWaitingForCreditOrders moves orders back to generating", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(portraitOrder(id, "waiting_for_credit"));
  await jsonStore.updateSettings({
    falCreditExhaustedSince: new Date().toISOString(),
    falCreditAlertSentAt: new Date().toISOString(),
  });
  const count = await resumeWaitingForCreditOrders();
  assert.equal(count, 1);
  assert.equal((await jsonStore.getOrder(id))?.status, "generating");
  await clearFalCreditExhaustedState();
  const settings = await jsonStore.getSettings("pawtraitry");
  assert.equal(settings.falCreditExhaustedSince, null);
});

test("markFalCreditExhausted sets exhausted timestamp without throwing", async () => {
  process.env.EMAIL_PROVIDER = "none";
  await clearFalCreditExhaustedState();
  await markFalCreditExhausted("TOP_UP");
  const settings = await jsonStore.getSettings("pawtraitry");
  assert.ok(settings.falCreditExhaustedSince);
});
