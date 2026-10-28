import assert from "node:assert/strict";
import test from "node:test";
import { checkoutErrorMessage, parseCheckoutResponse } from "../lib/checkout/client";
import {
  checkoutAllowedPaymentMethodTypes,
  integrationIdentifier,
  openCheckoutSessionUrl,
  stripeCheckoutErrorResponse,
} from "../lib/stripe/checkout";

const orderId = "00000000-0000-4000-8000-000000000031";

test("integrationIdentifier is stable for the same order", () => {
  const first = integrationIdentifier("portrait", orderId);
  const second = integrationIdentifier("portrait", orderId);
  assert.equal(first, second);
  assert.match(first, /^pawtraitry_portrait_/);
});

test("integrationIdentifier differs across orders", () => {
  const a = integrationIdentifier("portrait", orderId);
  const b = integrationIdentifier("portrait", "00000000-0000-4000-8000-000000000032");
  assert.notEqual(a, b);
});

test("portrait retry uses stable idempotency inputs", () => {
  const amountPence = 1999;
  const idempotencyKey = `portrait-${orderId}-${amountPence}`;
  assert.equal(idempotencyKey, `portrait-${orderId}-${amountPence}`);
  assert.equal(integrationIdentifier("portrait", orderId), integrationIdentifier("portrait", orderId));
});

test("openCheckoutSessionUrl returns open session url", async () => {
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => ({
          status: "open",
          url: "https://checkout.stripe.com/c/pay/cs_test_open",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      },
    },
  };
  const url = await openCheckoutSessionUrl(stripe as never, "cs_test_open");
  assert.equal(url, "https://checkout.stripe.com/c/pay/cs_test_open");
});

test("stripeCheckoutErrorResponse returns JSON for idempotency errors", async () => {
  const response = stripeCheckoutErrorResponse({ type: "StripeIdempotencyError", statusCode: 400, message: "Keys" });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /already in progress/i);
});

test("parseCheckoutResponse handles empty 500 bodies", async () => {
  const parsed = await parseCheckoutResponse(new Response("", { status: 500 }));
  assert.equal(parsed.ok, false);
  assert.match(checkoutErrorMessage(parsed.body, parsed.ok), /try again/i);
});

test("checkout allows card and excludes klarna", () => {
  assert.deepEqual(checkoutAllowedPaymentMethodTypes(), ["card"]);
});
