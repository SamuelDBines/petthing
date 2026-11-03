import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.LOCAL_DATA_DIR = mkdtempSync(join(tmpdir(), "petthing-preview-paid-"));
process.env.EMAIL_PROVIDER = "none";
process.env.MANUAL_REVIEW = "true"; // free previews must auto-deliver even when manual review is on
delete process.env.FAL_KEY;

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import type { Order } from "../lib/domain";
import { putBlob, readBlob } from "../lib/blobs";
import { markPortraitPaid } from "../lib/fulfillment";
import { jsonStore } from "../lib/store/json";

function previewOrder(id: string): Order {
  const now = new Date().toISOString();
  return {
    id, storeId: "pawtraitry", createdAt: now, email: "paid-preview@example.com", themeId: "studio", subjectType: "pet",
    tierId: "digital_pack", styleIds: ["oil"], cardNames: "", status: "pending_payment", stripeCheckoutSessionId: null,
    stripePaymentIntentId: null, amountPence: 599, priority: false, consentAt: now, digitalSupplyConsentAt: now, utm: {},
    referralCodeUsed: null, ownReferralCode: `PAW-PP-${id}`, resultsToken: `results-${id}`, uploadToken: `upload-${id}`,
    generationCostGbp: 0, deliveredAt: null, photosDeleteAfter: null, resultsDeleteAfter: null, ipHash: "",
    uploadsDeletedAt: null, resultsDeletedAt: null, failureReason: null, processedSessions: [], referralRewardGranted: false,
    pendingBonusEmail: false, offer: "one_off", stripeSubscriptionId: null, subscriptionStatus: null, payments: [],
    productMeta: { freePreview: { customPrompts: {}, chosenAssetId: null, path: "digital" } },
  };
}

test("paid free-preview order auto-delivers every preview upscaled 4x, no review", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(previewOrder(id));
  const now = new Date().toISOString();
  for (let i = 0; i < 2; i += 1) {
    await jsonStore.addJobs([{ id: randomUUID(), orderId: id, styleId: "oil", variantIndex: i, status: "done", attempts: 1,
      providerRequestId: null, lastError: null, costGbp: 0.03, priority: false, lockedUntil: null, nextRunAt: null, createdAt: now, updatedAt: now }]);
    const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#884422" } }).jpeg().toBuffer();
    const path = `${id}/results/${i}.jpg`;
    await putBlob("results", path, bytes, "image/jpeg");
    await jsonStore.addAsset({ id: randomUUID(), orderId: id, kind: "result", styleId: "oil", variantIndex: i, storagePath: path,
      bucket: "results", contentType: "image/jpeg", moderation: "passed", createdAt: now });
  }
  await markPortraitPaid(id, { sessionId: "cs_test_paid", paymentIntentId: null, amountPence: 599 });
  let order = await jsonStore.getOrder(id);
  for (let i = 0; i < 50 && order?.status !== "delivered"; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
    order = await jsonStore.getOrder(id);
  }
  assert.equal(order?.status, "delivered");
  const upscaled = Object.values(order?.productMeta?.freePreview?.upscaled ?? {});
  assert.equal(upscaled.length, 2);
  for (const entry of upscaled) {
    assert.equal(entry.fallback, undefined);
    assert.equal(entry.width, 400);
    const blob = await readBlob("results", entry.storagePath);
    const meta = await sharp(blob!.bytes).metadata();
    assert.equal(meta.width, 400);
    assert.equal(meta.height, 320);
  }
});

test("spend cap defers the upscale instead of calling fal", async () => {
  const id = randomUUID();
  await jsonStore.createOrder(previewOrder(id));
  const now = new Date().toISOString();
  await jsonStore.addJobs([{ id: randomUUID(), orderId: id, styleId: "oil", variantIndex: 0, status: "done", attempts: 1,
    providerRequestId: null, lastError: null, costGbp: 0.03, priority: false, lockedUntil: null, nextRunAt: null, createdAt: now, updatedAt: now }]);
  const bytes = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#224488" } }).jpeg().toBuffer();
  await putBlob("results", `${id}/results/0.jpg`, bytes, "image/jpeg");
  await jsonStore.addAsset({ id: randomUUID(), orderId: id, kind: "result", styleId: "oil", variantIndex: 0, storagePath: `${id}/results/0.jpg`,
    bucket: "results", contentType: "image/jpeg", moderation: "passed", createdAt: now });
  process.env.FAL_KEY = "test-not-a-real-key";
  await jsonStore.addSpend(1000, "pawtraitry");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error("fal must not be called over the cap"); }) as typeof fetch;
  try {
    const { deliverOrder } = await import("../lib/generation");
    await deliverOrder(id);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.FAL_KEY;
  }
  const order = await jsonStore.getOrder(id);
  assert.equal(order?.status, "generating");
  assert.equal(order?.failureReason, "waiting_for_upscale");
});
