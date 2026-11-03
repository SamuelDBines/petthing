import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOM_STYLE_ID, PREVIEW_STYLES, cleanCustomPrompt, previewStyleById } from "../config/preview-styles";
import { BANNED_PROMPT_TERMS, buildPrompt } from "../config/stylePrompts";
import { DIGITAL_INCLUDED_TIER, DIGITAL_PACK_PENCE, DIGITAL_PACK_TIER, FREE_PREVIEWS_PER_EMAIL, getTier } from "../config/pricing";
import { getTheme } from "../config/themes";
import { orderAmountPence, pawtraitryBasketSummary, stripeLineItemsForPortraitCheckout } from "../lib/pawtraitry/create-basket";

test("pricing: £5.99 digital pack, 3 free previews, files included tier is free", () => {
  assert.equal(DIGITAL_PACK_PENCE, 599);
  assert.equal(DIGITAL_PACK_TIER.pricePence, 599);
  assert.equal(DIGITAL_INCLUDED_TIER.pricePence, 0);
  assert.equal(FREE_PREVIEWS_PER_EMAIL, 3);
  assert.equal(getTier("digital_pack").id, "digital_pack");
  assert.equal(getTier("digital_included").id, "digital_included");
});

test("every preview style has a clothed, family-friendly prompt", () => {
  assert.ok(getTheme("studio"));
  for (const style of PREVIEW_STYLES) {
    const prompt = buildPrompt({ styleId: style.id, subject: "pet", variantIndex: 0, quality: "hd", forFalKontext: true, customPrompt: "a dog on the moon" });
    assert.match(prompt.prompt ?? String(prompt), /clothed/i, style.id);
  }
  const custom = buildPrompt({ styleId: CUSTOM_STYLE_ID, subject: "pet", variantIndex: 0, quality: "hd", customPrompt: "astronaut on the moon" });
  assert.match(JSON.stringify(custom), /astronaut on the moon/);
  assert.ok(previewStyleById("snow-window"));
  assert.equal(previewStyleById("nope"), null);
});

test("custom prompts are cleaned and unsafe text rejected", () => {
  assert.equal(cleanCustomPrompt("  my cat   as a  pirate "), "my cat as a pirate");
  assert.equal(cleanCustomPrompt("hi"), null);
  assert.equal(cleanCustomPrompt("x".repeat(500))?.length, 200);
  assert.equal(cleanCustomPrompt("{subject} <script>")?.includes("{"), false);
  const banned = [...BANNED_PROMPT_TERMS];
  if (banned.length) assert.equal(cleanCustomPrompt(`dog as ${banned[0]}`, banned), null);
});

test("physical path: digital files are free, only physical items are charged", () => {
  const physical = [{ productId: "mug_11oz_white" as never, quantity: 1 }];
  const base = { offer: "one_off" as const, seasonPassPence: 0, priority: false, referralDiscountPence: 0, physical };
  const items = stripeLineItemsForPortraitCheckout({ ...base, brandName: "Pawtraitry", tier: DIGITAL_INCLUDED_TIER, seasonPassName: "" });
  assert.ok(items.every((item) => (item.price_data?.unit_amount ?? 0) > 0));
  const withPack = orderAmountPence({ ...base, tier: DIGITAL_PACK_TIER });
  const included = orderAmountPence({ ...base, tier: DIGITAL_INCLUDED_TIER });
  assert.equal(withPack - included, 599);
  const digitalOnly = orderAmountPence({ ...base, physical: [], tier: DIGITAL_PACK_TIER });
  assert.equal(digitalOnly, 599);
  const summary = pawtraitryBasketSummary({ ...base, physical: [], tier: DIGITAL_PACK_TIER, tierId: "digital_pack", seasonPassName: "" });
  assert.equal(summary.totalPence, 599);
});
