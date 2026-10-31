import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { createCheckoutSession } from "../lib/stripe/checkout";
import {
  isStatementDescriptorSuffixStripeError,
  maxStatementDescriptorSuffixLength,
  sanitizeStatementDescriptorSuffix,
  statementDescriptorSuffixForBrand,
} from "../lib/stripe/statement-descriptor-suffix";
import { checkoutSessionForStore } from "../lib/stripe/store-checkout";
import type { StoreBrand } from "../lib/tenant/types";

const pawtraitryBrand: StoreBrand = {
  appName: "Pawtraitry",
  tagline: "t",
  siteDomain: "pawtraitry.com",
  supportEmail: "hello@pawtraitry.com",
  legalTradingName: "Pawtraitry",
  footerTradingDisclosure: "d",
  emailFromName: "Pawtraitry",
  stripeStatementDescriptor: "PAWTRAITRY",
  statementDescriptorSuffix: "PAWTRAITRY",
  referralPrefix: "PAW",
  logoPath: "/logo.svg",
  colors: {
    ink: "#000",
    cream: "#fff",
    pumpkin: "#000",
    gold: "#000",
    moss: "#000",
    muted: "#000",
    bark: "#fff",
    line: "#000",
  },
};

const fixmongerBrand: StoreBrand = {
  ...pawtraitryBrand,
  appName: "Fixmonger",
  statementDescriptorSuffix: undefined,
  stripeStatementDescriptor: "FIXMONGER",
};

test("sanitizeStatementDescriptorSuffix strips illegal characters and truncates for prefix", () => {
  assert.equal(sanitizeStatementDescriptorSuffix('PAW<>TRAITRY'), "PAWTRAITRY");
  assert.equal(sanitizeStatementDescriptorSuffix("Café résumé"), "Cafe resume");
  assert.equal(maxStatementDescriptorSuffixLength("WILDFRAME"), 22 - "WILDFRAME".length - 2);
  const long = "A".repeat(30);
  assert.equal(
    sanitizeStatementDescriptorSuffix(long, "WILDFRAME").length,
    maxStatementDescriptorSuffixLength("WILDFRAME"),
  );
});

test("only configured stores get payment_intent_data.statement_descriptor_suffix", () => {
  const paw = checkoutSessionForStore(pawtraitryBrand, { mode: "payment" });
  assert.equal(paw.payment_intent_data?.statement_descriptor_suffix, "PAWTRAITRY");
  const fix = checkoutSessionForStore(fixmongerBrand, { mode: "payment" });
  assert.equal(fix.payment_intent_data?.statement_descriptor_suffix, undefined);
});

test("createCheckoutSession retries without suffix when Stripe rejects descriptor", async () => {
  let attempts = 0;
  const stripe = {
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams, opts?: { idempotencyKey?: string }) => {
          attempts += 1;
          if (attempts === 1) {
            assert.equal(params.payment_intent_data?.statement_descriptor_suffix, "PAWTRAITRY");
            const err = Object.assign(new Error("Invalid statement_descriptor_suffix"), {
              param: "payment_intent_data[statement_descriptor_suffix]",
            });
            throw err;
          }
          assert.equal(params.payment_intent_data?.statement_descriptor_suffix, undefined);
          assert.equal(opts?.idempotencyKey, "idem-1:no-descriptor-suffix");
          return { url: "https://checkout.stripe.test/cs", id: "cs_test", livemode: false };
        },
      },
    },
  } as unknown as Stripe;

  const result = await createCheckoutSession({
    stripe,
    brand: pawtraitryBrand,
    idempotencyKey: "idem-1",
    sessionParams: { mode: "payment", line_items: [] },
  });
  assert.equal(result.url, "https://checkout.stripe.test/cs");
  assert.equal(attempts, 2);
});

test("isStatementDescriptorSuffixStripeError detects descriptor param failures", () => {
  assert.equal(
    isStatementDescriptorSuffixStripeError({ param: "payment_intent_data[statement_descriptor_suffix]" }),
    true,
  );
  assert.equal(isStatementDescriptorSuffixStripeError(new Error("bad statement descriptor")), true);
  assert.equal(isStatementDescriptorSuffixStripeError(new Error("card declined")), false);
});

test("statementDescriptorSuffixForBrand prefers statementDescriptorSuffix field", () => {
  assert.equal(
    statementDescriptorSuffixForBrand({
      ...pawtraitryBrand,
      statementDescriptorSuffix: "PAW",
      stripeStatementDescriptorSuffix: "OTHER",
    }),
    "PAW",
  );
});
