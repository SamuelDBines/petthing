import assert from "node:assert/strict";
import test from "node:test";
import {
  isStoreLive,
  parseLiveStores,
  stripeSecretKeyForStore,
  storeExpectsStripeLivemode,
} from "../lib/go-live/live-stores";
import { __resetStripeClientForTests, getStripeForStore } from "../lib/stripe";

test("parseLiveStores normalises ids", () => {
  const prev = process.env.LIVE_STORES;
  process.env.LIVE_STORES = " Pawtraitry , fixmonger ";
  try {
    const set = parseLiveStores();
    assert.equal(set.has("pawtraitry"), true);
    assert.equal(set.has("fixmonger"), true);
    assert.equal(isStoreLive("PAWTRAITRY"), true);
    assert.equal(isStoreLive("jinglefold"), false);
  } finally {
    if (prev === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev;
  }
});

test("stripeSecretKeyForStore picks live vs test keys", () => {
  const keys = [
    "LIVE_STORES",
    "STRIPE_LIVE_MODE",
    "STRIPE_LIVE_SECRET_KEY",
    "STRIPE_TEST_SECRET_KEY",
  ] as const;
  const prev: Record<string, string | undefined> = {};
  for (const k of keys) prev[k] = process.env[k];
  process.env.LIVE_STORES = "pawtraitry";
  process.env.STRIPE_LIVE_MODE = "true";
  process.env.STRIPE_LIVE_SECRET_KEY = "sk_live_test_key_for_unit";
  process.env.STRIPE_TEST_SECRET_KEY = "sk_test_unit";
  __resetStripeClientForTests();
  try {
    assert.equal(stripeSecretKeyForStore("pawtraitry"), "sk_live_test_key_for_unit");
    assert.equal(stripeSecretKeyForStore("fixmonger"), "sk_test_unit");
    assert.equal(storeExpectsStripeLivemode("pawtraitry"), true);
    assert.equal(getStripeForStore("fixmonger") != null, true);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
    __resetStripeClientForTests();
  }
});
