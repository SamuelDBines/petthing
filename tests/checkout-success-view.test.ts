import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutSuccessAllowsPurchaseEvent,
  checkoutSuccessCopy,
  mapCheckoutSuccessPhase,
  showCheckoutUpsells,
} from "../lib/checkout/success-view";

test("mapCheckoutSuccessPhase maps portrait lifecycle", () => {
  assert.equal(mapCheckoutSuccessPhase({ kind: "portrait", status: "refunded" }), "refunded");
  assert.equal(mapCheckoutSuccessPhase({ kind: "portrait", status: "waiting_for_credit" }), "generating");
  assert.equal(mapCheckoutSuccessPhase({ kind: "portrait", status: "delivered" }), "ready");
  assert.equal(mapCheckoutSuccessPhase({ kind: "portrait", status: "generating" }), "generating");
  assert.equal(
    mapCheckoutSuccessPhase({
      kind: "portrait",
      status: "pending_payment",
      stripePaymentStatus: "paid",
    }),
    "confirming",
  );
  assert.equal(
    mapCheckoutSuccessPhase({
      kind: "portrait",
      status: "pending_payment",
      stripePaymentStatus: "unpaid",
      stripeSessionStatus: "expired",
    }),
    "expired_unpaid",
  );
});

test("purchase Meta events only on paid-ish phases", () => {
  assert.equal(checkoutSuccessAllowsPurchaseEvent("generating"), true);
  assert.equal(checkoutSuccessAllowsPurchaseEvent("ready"), true);
  assert.equal(checkoutSuccessAllowsPurchaseEvent("refunded"), false);
  assert.equal(checkoutSuccessAllowsPurchaseEvent("expired_unpaid"), false);
  assert.equal(checkoutSuccessAllowsPurchaseEvent("confirming"), false);
});

test("checkoutSuccessCopy never uses Payment received for refunded", () => {
  const copy = checkoutSuccessCopy("refunded", "portrait");
  assert.match(copy.title, /refund/i);
  assert.doesNotMatch(copy.title, /payment received/i);
});

test("showCheckoutUpsells only on generating and ready", () => {
  assert.equal(showCheckoutUpsells("generating"), true);
  assert.equal(showCheckoutUpsells("ready"), true);
  assert.equal(showCheckoutUpsells("review"), false);
  assert.equal(showCheckoutUpsells("refunded"), false);
});
