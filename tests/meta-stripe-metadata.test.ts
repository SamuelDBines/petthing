import assert from "node:assert/strict";
import test from "node:test";
import { mergeCheckoutStripeMetadata, metaConsentFromStripeMetadata } from "../lib/meta/stripe-metadata";

test("mergeCheckoutStripeMetadata adds short meta keys", () => {
  const merged = mergeCheckoutStripeMetadata(
    { kind: "portrait", orderId: "o1", storeId: "pawtraitry" },
    {
      purchaseEventId: "pur-1",
      initiateCheckoutEventId: "init-1",
      marketingConsent: true,
      fbp: "fb.1.1.x",
      fbc: "fb.1.2.y",
    },
  );
  assert.equal(merged.metaEventId, "pur-1");
  assert.equal(merged.metaInitEventId, "init-1");
  assert.equal(merged.metaMarketing, "1");
  assert.equal(merged.metaFbp, "fb.1.1.x");
  assert.equal(metaConsentFromStripeMetadata(merged), true);
});

test("mergeCheckoutStripeMetadata leaves base when no purchase event id", () => {
  const base = { kind: "shop", shopOrderId: "s1" };
  assert.deepEqual(mergeCheckoutStripeMetadata(base, null), base);
});
