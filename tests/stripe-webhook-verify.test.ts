import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { verifyStripeWebhookPayload } from "../lib/stripe/webhook-verify";

test("verifyStripeWebhookPayload accepts test secret", () => {
  const prev = { ...process.env };
  const secret = "whsec_test_verify";
  const key = "sk_test_webhook_verify";
  process.env.STRIPE_TEST_SECRET_KEY = key;
  process.env.STRIPE_TEST_WEBHOOK_SECRET = secret;
  const stripe = new Stripe(key);
  const payload = JSON.stringify({ id: "evt_test", object: "event", type: "ping" });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  try {
    const verified = verifyStripeWebhookPayload(payload, header);
    assert.ok(verified);
    assert.equal(verified!.event.id, "evt_test");
  } finally {
    process.env = prev;
  }
});
