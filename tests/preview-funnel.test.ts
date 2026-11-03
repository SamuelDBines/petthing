import test from "node:test";
import assert from "node:assert/strict";
import { DIGITAL_PACK_PENCE, DIGITAL_PACK_TIER } from "../config/pricing";
import {
  addedProductIds,
  digitalPackCartEvent,
  newlyReadyPreviewIds,
  parsePreviewDraft,
  physicalCartEvent,
  portraitCheckoutIdempotencyKey,
  shouldClearPreviewDraft,
} from "../lib/pawtraitry/preview-funnel";
import { checkoutSuccessAllowsPurchaseEvent } from "../lib/checkout/success-view";

test("preview draft keeps the delivery consent tick", () => {
  const draft = parsePreviewDraft(JSON.stringify({ orderId: "o1", uploadToken: "t", email: "a@b.c", supplyConsent: true }));
  assert.deepEqual(draft, { orderId: "o1", uploadToken: "t", email: "a@b.c", supplyConsent: true });
  assert.equal(parsePreviewDraft(JSON.stringify({ orderId: "o1", uploadToken: "t", email: "" }))?.supplyConsent, false);
  assert.equal(parsePreviewDraft("{bad"), null);
  assert.equal(parsePreviewDraft(JSON.stringify({ orderId: 1 })), null);
});

test("success page clears the draft only for confirmed paid phases", () => {
  assert.equal(shouldClearPreviewDraft(null), false);
  for (const phase of ["confirming", "expired_unpaid", "failed", "refunded"] as const) {
    assert.equal(shouldClearPreviewDraft({ trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase) }), false, phase);
  }
  for (const phase of ["generating", "ready", "print_processing"] as const) {
    assert.equal(shouldClearPreviewDraft({ trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase) }), true, phase);
  }
});

test("repeat checkout for the same amount after Back gets a fresh idempotency key", () => {
  const first = portraitCheckoutIdempotencyKey({ orderId: "o1", amountPence: 599, attemptAt: "2026-10-29T10:00:00.000Z" });
  const again = portraitCheckoutIdempotencyKey({ orderId: "o1", amountPence: 599, attemptAt: "2026-10-29T10:03:00.000Z" });
  assert.notEqual(first, again);
  assert.equal(first, portraitCheckoutIdempotencyKey({ orderId: "o1", amountPence: 599, attemptAt: "2026-10-29T10:00:00.000Z" }));
  assert.equal(portraitCheckoutIdempotencyKey({ orderId: "o1", amountPence: 599 }), "portrait-o1-599");
});

test("pixel payloads carry GBP value and content ids", () => {
  assert.deepEqual(digitalPackCartEvent(), { value: DIGITAL_PACK_PENCE / 100, currency: "GBP", contentIds: [DIGITAL_PACK_TIER.id] });
  const gift = physicalCartEvent([{ productId: "mug_11oz_white", quantity: 1 }]);
  assert.equal(gift.currency, "GBP");
  assert.ok(gift.value > 0);
  assert.ok(gift.contentIds.includes("mug_11oz_white"));
});

test("add to cart only fires for increases and new previews only once", () => {
  assert.deepEqual(addedProductIds([], [{ productId: "mug_11oz_white", quantity: 1 }]), ["mug_11oz_white"]);
  assert.deepEqual(addedProductIds([{ productId: "mug_11oz_white", quantity: 2 }], [{ productId: "mug_11oz_white", quantity: 1 }]), []);
  const seen = new Set(["a"]);
  assert.deepEqual(
    newlyReadyPreviewIds([{ jobId: "a", status: "ready" }, { jobId: "b", status: "ready" }, { jobId: "c", status: "working" }], seen),
    ["b"],
  );
});
