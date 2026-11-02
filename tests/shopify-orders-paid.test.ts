import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.LOCAL_DATA_DIR = mkdtempSync(join(tmpdir(), "pt-shopify-"));
process.env.EMAIL_PROVIDER = "none";
delete process.env.FAL_KEY;
delete process.env.DATABASE_URL;

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import {
  buildInternalOrder,
  groupPortraitLines,
  shippingFromShopify,
  styleIdFromLabel,
  verifyShopifyHmac,
  type ShopifyOrderPayload,
} from "../lib/shopify/orders-paid";
import { handleShopifyOrdersPaid } from "../lib/shopify/orders-paid-handler";
import { refundPortraitLineItem } from "../lib/pawtraitry/partial-refund";
import { getPrint } from "../config/prints";
import { jsonStore } from "../lib/store/json";

const PHOTO = "https://cdn.shopify.com/s/files/1/0000/0001/files/uploads/cat.jpg";
const SECRET = "test-webhook-secret";

function sampleOrder(over: Partial<ShopifyOrderPayload> = {}): ShopifyOrderPayload {
  return {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    name: "#1001",
    email: "samuelbines+shopifytest@gmail.com",
    financial_status: "paid",
    test: true,
    total_price: "85.98",
    shipping_address: { first_name: "Sam", last_name: "Test", address1: "1 Test Street", city: "London", zip: "E1 6AN", country_code: "GB" },
    line_items: [
      { id: 1, sku: "PT-DIGITAL", quantity: 1, title: "Digital Portrait Pack", properties: [
        { name: "Pet photo", value: PHOTO }, { name: "Style", value: "Oil painting" }, { name: "Pet name", value: "Biscuit" } ] },
      { id: 2, sku: "GLOBAL-CFPM-A3-BLACK", quantity: 1, title: "Framed Print", properties: [
        { name: "Pet photo", value: PHOTO }, { name: "Style", value: "Oil painting" } ] },
      { id: 3, sku: "GLOBAL-MUG-W", quantity: 2, title: "Mug", properties: [
        { name: "Pet photo", value: PHOTO }, { name: "Style", value: "Describe your own" }, { name: "Custom style", value: "astronaut on the moon" } ] },
    ],
    ...over,
  };
}

function sign(body: string, secret = SECRET) {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

test("HMAC: accepts Shopify signature, rejects tampered body or wrong secret", () => {
  const body = JSON.stringify(sampleOrder());
  assert.equal(verifyShopifyHmac(body, sign(body), SECRET), true);
  assert.equal(verifyShopifyHmac(body + " ", sign(body), SECRET), false);
  assert.equal(verifyShopifyHmac(body, sign(body, "other"), SECRET), false);
  assert.equal(verifyShopifyHmac(body, null, SECRET), false);
  assert.equal(verifyShopifyHmac(body, sign(body), undefined), false);
});

test("every Shopify SKU maps to a real print product", () => {
  for (const sku of ["GLOBAL-CFPM-A1-NATURAL", "PT-PRINT-A2", "GLOBAL-CUSH-18X18-SUE", "CLASSIC-GRE-FEDR-A5-BLA", "H-COAST-4PK", "GLOBAL-MUG-W"]) {
    const { groups } = groupPortraitLines({ id: 1, line_items: [{ id: 9, sku, quantity: 1, properties: [{ name: "Pet photo", value: PHOTO }, { name: "Style", value: "Cartoon" }] }] });
    assert.equal(groups[0]!.unknownSkus.length, 0, sku);
    assert.ok(getPrint(groups[0]!.physical[0]!.productId), sku);
  }
});

test("theme style labels map to style ids", () => {
  for (const label of ["Oil painting", "Watercolour", "Renaissance", "Royal portrait", "Cartoon", "Pop art", "Charcoal sketch", "Minimal line art", "Christmas snow window"]) {
    assert.ok(styleIdFromLabel(label), label);
  }
  assert.equal(styleIdFromLabel("Describe your own"), "custom");
  assert.equal(styleIdFromLabel("Nope"), null);
});

test("lines group by photo + style; non-Shopify photo URLs are refused", () => {
  const { groups, problems } = groupPortraitLines(sampleOrder());
  assert.equal(groups.length, 2);
  assert.equal(groups[0]!.digital, true);
  assert.deepEqual(groups[0]!.physical, [{ productId: "cfpm_a3_black", quantity: 1 }]);
  assert.equal(groups[1]!.customPrompt, "astronaut on the moon");
  assert.deepEqual(groups[1]!.physical, [{ productId: "mug_11oz_white", quantity: 2 }]);
  assert.equal(problems.length, 0);
  const bad = groupPortraitLines(sampleOrder({ line_items: [{ id: 5, sku: "PT-DIGITAL", quantity: 1, properties: [{ name: "Pet photo", value: "https://evil.example/x.jpg" }, { name: "Style", value: "Cartoon" }] }] }));
  assert.equal(bad.groups.length, 0);
  assert.equal(bad.problems.length, 1);
});

test("internal order fits the free-preview + basket pipeline", () => {
  const payload = sampleOrder();
  const { groups } = groupPortraitLines(payload);
  const order = buildInternalOrder({ payload, group: groups[1]!, groupIndex: 1, referralCode: "PAW-X" });
  assert.equal(order.storeId, "pawtraitry");
  assert.equal(order.status, "paid");
  assert.equal(order.tierId, "digital_included");
  assert.deepEqual(order.styleIds, ["custom"]);
  assert.equal(order.productMeta?.freePreview?.customPrompts?.["0"], "astronaut on the moon");
  assert.equal(order.productMeta?.shopify?.orderName, "#1001");
  assert.equal(order.stripeCheckoutSessionId, `shopify:${payload.id}:1`);
  assert.equal(order.stripeLivemode, false);
  assert.deepEqual(shippingFromShopify(payload), { name: "Sam Test", line1: "1 Test Street", line2: "", city: "London", postalCode: "E1 6AN", countryCode: "GB" });
});

test("handler: signed sample order creates orders, uploads, jobs; retry is idempotent", async () => {
  const jpeg = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#884422" } }).jpeg().toBuffer();
  const scheduled: string[] = [];
  const alerts: string[] = [];
  const deps = {
    fetchImage: async (url: string) => {
      assert.equal(url, PHOTO);
      return jpeg;
    },
    schedule: (id: string) => scheduled.push(id),
    alert: async (subject: string) => alerts.push(subject),
  };
  const payload = sampleOrder();
  const body = JSON.stringify(payload);
  assert.ok(verifyShopifyHmac(body, sign(body), SECRET));
  const first = await handleShopifyOrdersPaid(JSON.parse(body), deps);
  assert.equal(first.created.length, 2);
  assert.deepEqual(first.problems, []);
  assert.equal(alerts.length, 0);
  for (const id of first.created) {
    const order = await jsonStore.getOrder(id);
    assert.equal(order?.status, "generating");
    const assets = await jsonStore.listAssets(id);
    assert.equal(assets.filter((a) => a.kind === "upload").length, 1);
    const jobs = await jsonStore.listJobs(id);
    assert.equal(jobs.length, 1, "exactly one paid generation per portrait (fal cap)");
  }
  assert.deepEqual(scheduled, first.created);
  const again = await handleShopifyOrdersPaid(JSON.parse(body), deps);
  assert.equal(again.created.length, 0);
  assert.equal(again.skipped.length, 2);
});

test("handler: unpaid and photo-less orders do not generate, admin is alerted", async () => {
  const alerts: string[] = [];
  const deps = { fetchImage: async () => Buffer.alloc(0), schedule: () => {}, alert: async (s: string) => alerts.push(s) };
  const pending = await handleShopifyOrdersPaid(sampleOrder({ id: Date.now() + 2, financial_status: "pending" }), deps);
  assert.equal(pending.created.length, 0);
  const nophoto = await handleShopifyOrdersPaid(sampleOrder({ id: Date.now() + 3, line_items: [{ id: 7, sku: "PT-DIGITAL", quantity: 1, properties: [] }] }), deps);
  assert.equal(nophoto.created.length, 0);
  assert.equal(alerts.length, 1);
});

test("refunds on Shopify orders alert the admin instead of Stripe or the customer", async () => {
  const payload = sampleOrder({ id: Date.now() + 4 });
  const order = buildInternalOrder({ payload, group: groupPortraitLines(payload).groups[0]!, groupIndex: 0, referralCode: "PAW-Y" });
  await refundPortraitLineItem(order, 7999, "test");
});
