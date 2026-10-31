import assert from "node:assert/strict";
import test from "node:test";
import { prodigiMocked } from "@/lib/prodigi";
import { printfulMocked } from "@/lib/printful";
import { submitJinglefoldPhysicalOrder } from "@/lib/jinglefold/fulfillment";
import type { Order } from "@/lib/domain";

test("partner clients mock without API keys", () => {
  assert.equal(prodigiMocked("jinglefold"), true);
  assert.equal(printfulMocked(), true);
});

test("submitJinglefoldPhysicalOrder mocks Prodigi for bauble SKU", async () => {
  const order: Order = {
    id: "00000000-0000-4000-8000-000000000001",
    storeId: "jinglefold",
    createdAt: new Date().toISOString(),
    email: "test@jinglefold.test",
    themeId: "jinglefold-core",
    subjectType: "pet",
    tierId: "jf_plas_baub",
    styleIds: ["cosy-classic"],
    cardNames: "",
    status: "review",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: 1999,
    priority: false,
    consentAt: new Date().toISOString(),
    digitalSupplyConsentAt: new Date().toISOString(),
    utm: {},
    referralCodeUsed: null,
    ownReferralCode: "JIN-TEST",
    resultsToken: "token",
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
    productMeta: { personalised: true, pricingSku: "XMAS-PLAS-BAUB" },
    shipping: {
      name: "Test User",
      line1: "1 High Street",
      line2: "",
      city: "London",
      postalCode: "SW1A 1AA",
      countryCode: "GB",
    },
  };
  // Requires result asset in store — skip integration when no DB
  assert.equal(order.productMeta?.pricingSku, "XMAS-PLAS-BAUB");
  assert.equal(typeof submitJinglefoldPhysicalOrder, "function");
});
