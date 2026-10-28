import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  checkoutSessionMetadataIsOurs,
  chargeBelongsToUs,
} from "../lib/stripe/ownership";
import { handleStripeWebhookEvent } from "../lib/stripe/webhook-handler";

test("checkoutSessionMetadataIsOurs rejects foreign donation sessions", () => {
  assert.equal(
    checkoutSessionMetadataIsOurs({
      metadata: { kind: "donation", user_id: "u1" },
    } as unknown as Stripe.Checkout.Session),
    false,
  );
  assert.equal(
    checkoutSessionMetadataIsOurs({
      metadata: { kind: "monthly_gift", user_id: "u1" },
    } as unknown as Stripe.Checkout.Session),
    false,
  );
  assert.equal(
    checkoutSessionMetadataIsOurs({
      metadata: { kind: "shop", storeId: "fixmonger", shopOrderId: "ord_1" },
    } as unknown as Stripe.Checkout.Session),
    true,
  );
});

test("foreign checkout.session.completed is ignored without fulfillment", async () => {
  let fulfilled = 0;
  const outcome = await handleStripeWebhookEvent(
    {
      id: "evt_1",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_foreign",
          metadata: { kind: "donation", user_id: "backlogr" },
          payment_status: "paid",
        },
      },
    } as unknown as Stripe.Event,
    {
      fulfillCheckoutSession: async () => {
        fulfilled += 1;
      },
    },
  );
  assert.equal(outcome.status, "ignored");
  assert.equal(fulfilled, 0);
});

test("foreign charge.refunded does not alert admin", async () => {
  let alerts = 0;
  const outcome = await handleStripeWebhookEvent(
    {
      id: "evt_2",
      type: "charge.refunded",
      livemode: false,
      data: {
        object: {
          id: "ch_foreign",
          metadata: { product: "tallyoh" },
          payment_intent: "pi_foreign_other_app",
        },
      },
    } as unknown as Stripe.Event,
    {
      lookupPaymentIntent: async () => false,
      alertAdmin: async () => {
        alerts += 1;
      },
    },
  );
  assert.equal(outcome.status, "ignored");
  assert.equal(alerts, 0);
});

test("our charge.refunded alerts admin when payment intent matches", async () => {
  let alerts = 0;
  const outcome = await handleStripeWebhookEvent(
    {
      id: "evt_3",
      type: "charge.refunded",
      livemode: false,
      data: {
        object: {
          id: "ch_ours",
          metadata: {},
          payment_intent: "pi_pawtraitry_1",
        },
      },
    } as unknown as Stripe.Event,
    {
      lookupPaymentIntent: async (id) => id === "pi_pawtraitry_1",
      alertAdmin: async () => {
        alerts += 1;
      },
    },
  );
  assert.equal(outcome.status, "ok");
  assert.equal(alerts, 1);
});

test("transient failure on our checkout returns retry", async () => {
  const outcome = await handleStripeWebhookEvent(
    {
      id: "evt_4",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_ours",
          metadata: { kind: "shop", storeId: "pawtraitry", shopOrderId: "shop_1" },
          payment_status: "paid",
        },
      },
    } as unknown as Stripe.Event,
    {
      fulfillCheckoutSession: async () => {
        throw new Error("fetch failed");
      },
    },
  );
  assert.equal(outcome.status, "retry");
});

test("non-transient failure on our checkout returns ok after logging path", async () => {
  let alerts = 0;
  const outcome = await handleStripeWebhookEvent(
    {
      id: "evt_5",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_ours2",
          metadata: { kind: "portrait", storeId: "pawtraitry", orderId: "ord_x" },
          payment_status: "paid",
        },
      },
    } as unknown as Stripe.Event,
    {
      fulfillCheckoutSession: async () => {
        throw new Error("validation failed");
      },
      alertAdmin: async () => {
        alerts += 1;
      },
    },
  );
  assert.equal(outcome.status, "ok");
  assert.equal(alerts, 1);
});

test("livemode mismatch ignored when store is live but event is test", async () => {
  const prev = process.env.LIVE_STORES;
  process.env.LIVE_STORES = "pawtraitry";
  let fulfilled = 0;
  try {
    const outcome = await handleStripeWebhookEvent(
      {
        id: "evt_livemode",
        type: "checkout.session.completed",
        livemode: false,
        data: {
          object: {
            id: "cs_test_on_live_store",
            metadata: { kind: "portrait", storeId: "pawtraitry", orderId: "ord_1" },
            payment_status: "paid",
          },
        },
      } as unknown as Stripe.Event,
      {
        fulfillCheckoutSession: async () => {
          fulfilled += 1;
        },
      },
    );
    assert.equal(outcome.status, "ignored");
    assert.equal(fulfilled, 0);
  } finally {
    if (prev === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev;
  }
});

test("chargeBelongsToUs respects charge metadata storeId", async () => {
  const ours = await chargeBelongsToUs(
    { metadata: { storeId: "fixmonger" }, payment_intent: null } as unknown as Stripe.Charge,
    async () => false,
  );
  assert.equal(ours, true);
});
