import assert from "node:assert/strict";
import test from "node:test";
import { assertStripeSecretKeyAllowed, stripeLiveKeyOptInEnabled } from "../lib/stripe/live-key";
import { getStripe, __resetStripeClientForTests } from "../lib/stripe";
import { validateGoLive } from "../lib/go-live/requirements";

test("live Stripe secret keys require STRIPE_LIVE_MODE opt-in", () => {
  assert.equal(stripeLiveKeyOptInEnabled({ STRIPE_LIVE_MODE: "true" } as unknown as NodeJS.ProcessEnv), true);
  assert.throws(
    () => assertStripeSecretKeyAllowed("sk_live_test_key"),
    /STRIPE_LIVE_MODE=true/,
  );
  assert.doesNotThrow(() =>
    assertStripeSecretKeyAllowed("sk_live_test_key", { STRIPE_LIVE_MODE: "true" } as unknown as NodeJS.ProcessEnv),
  );
  assert.doesNotThrow(() => assertStripeSecretKeyAllowed("sk_test_abc"));
});

test("getStripe refuses sk_live_ without opt-in", () => {
  const prev = { ...process.env };
  process.env.STRIPE_SECRET_KEY = "sk_live_abc";
  delete process.env.STRIPE_LIVE_MODE;
  try {
    __resetStripeClientForTests();
    assert.throws(() => getStripe(), /STRIPE_LIVE_MODE/);
    process.env.STRIPE_LIVE_MODE = "true";
    __resetStripeClientForTests();
    const client = getStripe();
    assert.ok(client);
  } finally {
    __resetStripeClientForTests();
    process.env.STRIPE_SECRET_KEY = prev.STRIPE_SECRET_KEY;
    process.env.STRIPE_LIVE_MODE = prev.STRIPE_LIVE_MODE;
  }
});

test("validateGoLive requires STRIPE_LIVE_MODE for live secret keys", () => {
  const env = {
    ...process.env,
    DATABASE_URL: "postgres://local/test",
    STRIPE_SECRET_KEY: "sk_live_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  } as NodeJS.ProcessEnv;
  delete (env as Record<string, string | undefined>).STRIPE_LIVE_MODE;
  const blocked = validateGoLive(env);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.missing.some((m) => m.key === "STRIPE_LIVE_MODE"));
  const ok = validateGoLive({ ...env, STRIPE_LIVE_MODE: "true" });
  assert.ok(!ok.missing.some((m) => m.key === "STRIPE_LIVE_MODE"));
});
