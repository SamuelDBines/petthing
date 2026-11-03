import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { putBlob } from "../lib/blobs";
import { paintPlaceholder } from "../lib/placeholderImage";
import { getStore } from "../lib/store";
import { watermark } from "../lib/watermark";
import type { Order } from "../lib/domain";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // The demo store works without a local env file.
  }
}

loadEnv();

const demoId = "00000000-0000-4000-8000-000000000001";

async function main() {
  const store = getStore();
  const existing = await store.getOrder(demoId);
  if (existing) {
    console.log(`Demo gallery: /results/${existing.resultsToken}`);
    return;
  }
  const now = new Date().toISOString();
  const order: Order = {
    id: demoId,
    storeId: "pawtraitry",
    createdAt: now,
    email: "demo@pawtraitry.local",
    themeId: "halloween",
    subjectType: "pet",
    tierId: "deluxe",
    styleIds: ["victorian-portrait", "pumpkin-dusk", "storybook", "friendly-vampires", "witch-familiar", "skeleton-dance"],
    cardNames: "Love from the demo hound",
    status: "delivered",
    stripeCheckoutSessionId: "seed",
    stripePaymentIntentId: null,
    amountPence: 1599,
    priority: false,
    consentAt: now,
    digitalSupplyConsentAt: now,
    utm: { utm_source: "seed" },
    referralCodeUsed: null,
    ownReferralCode: "PAW-DEMO1",
    resultsToken: randomUUID(),
    uploadToken: randomUUID(),
    generationCostGbp: 0,
    deliveredAt: now,
    photosDeleteAfter: new Date(Date.now() + 7 * 86400000).toISOString(),
    resultsDeleteAfter: new Date(Date.now() + 30 * 86400000).toISOString(),
    ipHash: "seed",
    uploadsDeletedAt: null,
    resultsDeletedAt: null,
    failureReason: null,
    processedSessions: ["seed"],
    referralRewardGranted: false,
    pendingBonusEmail: false,
    offer: "one_off",
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    payments: [{ sessionId: "seed", paymentIntentId: null, amountPence: 1599, kind: "seed", createdAt: now }],
  };
  await store.createOrder(order);
  const styles = ["victorian-portrait", "pumpkin-dusk", "storybook", "witch-familiar"];
  for (const [index, styleId] of styles.entries()) {
    const bytes = paintPlaceholder(index + 1);
    const assetId = randomUUID();
    const storagePath = `${order.id}/results/${styleId}-0.png`;
    await putBlob("results", storagePath, bytes, "image/png");
    await store.addAsset({
      id: assetId,
      orderId: order.id,
      kind: "result",
      styleId,
      variantIndex: 0,
      storagePath,
      bucket: "results",
      contentType: "image/png",
      moderation: "skipped",
      createdAt: now,
    });
    const previewPath = `${order.id}/previews/${assetId}.jpg`;
    await putBlob("results", previewPath, await watermark(bytes), "image/jpeg");
    await store.addAsset({
      id: randomUUID(),
      orderId: order.id,
      kind: "preview",
      styleId,
      variantIndex: 0,
      storagePath: previewPath,
      bucket: "results",
      contentType: "image/jpeg",
      moderation: "passed",
      createdAt: now,
    });
  }
  console.log(`Demo gallery: http://localhost:3000/results/${order.resultsToken}`);
  console.log("Admin password is the ADMIN_PASSWORD value in .env.local (portrait-dev if you kept the sample).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
