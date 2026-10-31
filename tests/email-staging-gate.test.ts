import assert from "node:assert/strict";
import test from "node:test";
import { emailStagingGateApplies, stagingAllowsRecipient } from "../lib/email/staging-gate";
import { stripeSecretKeyForStore } from "../lib/go-live/live-stores";

test("email gate open on canonical live host for live store", () => {
  const prev = process.env.LIVE_STORES;
  process.env.LIVE_STORES = "pawtraitry";
  delete process.env.EMAIL_STAGING_GATE;
  try {
    assert.equal(
      emailStagingGateApplies({ storeId: "pawtraitry", requestHost: "pawtraitry.com" }),
      false,
    );
    assert.equal(
      emailStagingGateApplies({ storeId: "pawtraitry", requestHost: "pawtraitry.dropship.store.bishop-co-tech.co.uk" }),
      true,
    );
    assert.equal(emailStagingGateApplies({ storeId: "fixmonger", requestHost: "fixmonger.com" }), true);
    assert.equal(emailStagingGateApplies({ stripeLivemode: true }), false);
  } finally {
    if (prev === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev;
  }
});

test("staging allowlist still applies when gate is on", () => {
  assert.equal(stagingAllowsRecipient("samuelbines@gmail.com"), true);
  assert.equal(stagingAllowsRecipient("shopper@example.co.uk"), false);
});

test("staging host uses test Stripe for LIVE_STORES pawtraitry", () => {
  const keys = ["LIVE_STORES", "STRIPE_LIVE_MODE", "STRIPE_LIVE_SECRET_KEY", "STRIPE_TEST_SECRET_KEY"] as const;
  const prev: Record<string, string | undefined> = {};
  for (const k of keys) prev[k] = process.env[k];
  process.env.LIVE_STORES = "pawtraitry";
  process.env.STRIPE_LIVE_MODE = "true";
  process.env.STRIPE_LIVE_SECRET_KEY = "sk_live_unit";
  process.env.STRIPE_TEST_SECRET_KEY = "sk_test_unit";
  try {
    assert.equal(stripeSecretKeyForStore("pawtraitry", "pawtraitry.com"), "sk_live_unit");
    assert.equal(
      stripeSecretKeyForStore("pawtraitry", "pawtraitry.dropship.store.bishop-co-tech.co.uk"),
      "sk_test_unit",
    );
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});
