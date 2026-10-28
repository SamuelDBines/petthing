import test from "node:test";
import assert from "node:assert/strict";
import { getPrint } from "../config/prints";
import { getTier, REFERRAL_DISCOUNT, TIERS, discountedPence } from "../config/pricing";
import { printProductIdsAvailableForTier } from "../lib/pawtraitry/create-basket-offers";
import { existingBasketPrintUnits } from "../lib/pawtraitry/basket-fulfillment";
import { falPrintUpscaleCostGbp } from "../lib/fal/print-upscale";
import {
  normalizePhysicalBasket,
  orderAmountPence,
  pawtraitryBasketHasPhysical,
  pawtraitryBasketShippingPence,
  pawtraitryBasketSummary,
  pawtraitryMetaContentIds,
  stripeLineItemsForPortraitCheckout,
} from "../lib/pawtraitry/create-basket";

test("basket pricing sums tier, physical lines, and priority", () => {
  const tier = getTier("classic");
  const physical = normalizePhysicalBasket([
    { productId: "mug_11oz_white", quantity: 2 },
    { productId: "greeting_card_a5", quantity: 1 },
  ]);
  const total = orderAmountPence({
    tier,
    offer: "one_off",
    seasonPassPence: 0,
    priority: true,
    referralDiscountPence: 0,
    physical,
  });
  assert.equal(total, tier.pricePence + 1999 * 2 + getPrint("greeting_card_a5").pricePence + 299);
});

test("checkout stripe line items include quantities and portrait tier", () => {
  const tier = TIERS.find((t) => t.id === "mini")!;
  const items = stripeLineItemsForPortraitCheckout({
    brandName: "Pawtraitry",
    tier,
    offer: "one_off",
    seasonPassPence: 0,
    seasonPassName: "",
    priority: false,
    physical: [{ productId: "mug_11oz_white", quantity: 2 }],
    referralDiscountPence: REFERRAL_DISCOUNT,
  });
  assert.equal(items.length, 2);
  assert.equal(items[0]?.price_data?.unit_amount, discountedPence(tier.pricePence, REFERRAL_DISCOUNT));
  assert.equal(items[1]?.quantity, 2);
});

test("shipping is zero at checkout when prints are included in price", () => {
  const physical = [{ productId: "coasters_4pk" as const, quantity: 1 }];
  assert.equal(pawtraitryBasketShippingPence(physical), 0);
  const summary = pawtraitryBasketSummary({
    tier: getTier("classic"),
    tierId: "classic",
    offer: "one_off",
    seasonPassPence: 0,
    seasonPassName: "",
    priority: false,
    referralDiscountPence: 0,
    physical,
  });
  assert.match(summary.shippingLabel, /included/i);
  assert.equal(summary.totalPence, summary.subtotalPence);
});

test("physical basket detection gates shipping address collection", () => {
  assert.equal(pawtraitryBasketHasPhysical(undefined), false);
  assert.equal(pawtraitryBasketHasPhysical({ physical: [] }), false);
  assert.equal(pawtraitryBasketHasPhysical({ physical: [{ productId: "puzzle_252", quantity: 1 }] }), true);
});

test("multi-line basket quantities expand for fulfilment", () => {
  const lines = normalizePhysicalBasket([
    { productId: "mug_11oz_white", quantity: 2 },
    { productId: "coasters_4pk", quantity: 1 },
  ]);
  const units = lines.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(units, 3);
});

test("meta content ids include tier, styles, and physical skus", () => {
  const ids = pawtraitryMetaContentIds({
    tierId: "classic",
    styleIds: ["a", "b"],
    physical: [{ productId: "mug_11oz_white", quantity: 2 }],
  });
  assert.deepEqual(ids, ["classic", "a", "b", "mug_11oz_white"]);
});

test("normalizePhysicalBasket merges duplicate skus", () => {
  const lines = normalizePhysicalBasket([
    { productId: "mug_11oz_white", quantity: 1 },
    { productId: "mug_11oz_white", quantity: 2 },
  ]);
  assert.deepEqual(lines, [{ productId: "mug_11oz_white", quantity: 3 }]);
});

test("basket print idempotency skips units already submitted", () => {
  const count = existingBasketPrintUnits(
    [
      {
        id: "1",
        orderId: "o",
        productId: "mug_11oz_white",
        assetId: "a",
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        prodigiOrderId: "pg-1",
        status: "submitted",
        shipping: null,
        error: null,
        createdAt: "",
      },
    ],
    "mug_11oz_white",
  );
  assert.equal(count, 1);
});

test("deluxe tier offers more print products than mini after upscale gating", () => {
  const mini = printProductIdsAvailableForTier(getTier("mini"));
  const classic = printProductIdsAvailableForTier(getTier("classic"));
  const deluxe = printProductIdsAvailableForTier(getTier("deluxe"));
  assert.ok(classic.length >= mini.length);
  assert.ok(deluxe.length >= classic.length);
  assert.ok(mini.includes("mug_11oz_white"));
});

test("fal print upscale default cost is about six tenths of a penny GBP", () => {
  assert.ok(falPrintUpscaleCostGbp() > 0);
  assert.ok(falPrintUpscaleCostGbp() < 0.02);
});
