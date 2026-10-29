import { readBlob, putBlob, signedBlobUrl } from "@/lib/blobs";
import { alertAdmin } from "@/lib/email";
import { isFalCreditExhaustedError } from "@/lib/fal/credit-exhaustion";
import { markFalCreditExhausted } from "@/lib/fal/credit-ops";
import { falUpscaleImage } from "@/lib/fal/print-upscale";
import { readPortraitDimensions } from "@/lib/print-compose/resolution";
import { maxDailySpendGbp } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { loadStoreConfig } from "@/lib/tenant/context";
import { mediaSigningBase, storeCanonicalOrigin } from "@/lib/tenant/origin";

export const WAITING_FOR_UPSCALE = "waiting_for_upscale";
const MAX_UPSCALE_ATTEMPTS = 3;

export type PreviewUpscaleOutcome = { ready: true } | { ready: false; reason: string };

/**
 * Paid free-preview order: 4x upscale every result before delivery.
 * Respects the daily spend cap and fal credit exhaustion (defers, the queue sweep retries).
 */
export async function upscalePaidPreviewResults(orderId: string): Promise<PreviewUpscaleOutcome> {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order?.productMeta?.freePreview) return { ready: true };
  const results = (await store.listAssets(orderId)).filter((a) => a.kind === "result");
  const usesFal = Boolean(process.env.FAL_KEY?.trim());
  for (const asset of results) {
    const current = (await store.getOrder(orderId))!;
    const meta = current.productMeta!.freePreview!;
    if (meta.upscaled?.[asset.id]) continue;
    const source = await readBlob(asset.bucket, asset.storagePath);
    if (!source) continue;
    if (usesFal) {
      const settings = await store.getSettings();
      if (settings.falCreditExhaustedSince) return { ready: false, reason: "fal credit exhausted" };
      if ((await store.todaySpend()) >= maxDailySpendGbp()) return { ready: false, reason: "daily spend cap" };
    }
    const config = await loadStoreConfig(current.storeId);
    const origin = storeCanonicalOrigin(current.storeId, config.brand, config.domains);
    const imageUrl = await signedBlobUrl(asset.bucket, asset.storagePath, 60 * 60, false, mediaSigningBase(origin));
    let entry: NonNullable<typeof meta.upscaled>[string];
    try {
      const up = await falUpscaleImage({ imageUrl, sourceBytes: source.bytes, storeId: current.storeId });
      const storagePath = `${orderId}/digital-upscale/${asset.id}.jpg`;
      await putBlob("results", storagePath, up.bytes, "image/jpeg");
      entry = { storagePath, width: up.width, height: up.height, costGbp: up.costGbp, completedAt: new Date().toISOString() };
    } catch (error) {
      if (isFalCreditExhaustedError(error)) {
        await markFalCreditExhausted(error instanceof Error ? error.message : "credit exhausted");
        return { ready: false, reason: "fal credit exhausted" };
      }
      const attempts = (meta.upscaleAttempts?.[asset.id] ?? 0) + 1;
      if (attempts < MAX_UPSCALE_ATTEMPTS) {
        await store.updateOrder(orderId, {
          productMeta: { ...current.productMeta, freePreview: { ...meta, upscaleAttempts: { ...meta.upscaleAttempts, [asset.id]: attempts } } },
        });
        return { ready: false, reason: error instanceof Error ? error.message : "upscale failed" };
      }
      // Give up on this one: deliver the native file rather than hold the order forever.
      const dims = await readPortraitDimensions(source.bytes);
      entry = { storagePath: asset.storagePath, width: dims.width, height: dims.height, costGbp: 0, fallback: true, completedAt: new Date().toISOString() };
      await alertAdmin(
        "Pawtraitry digital upscale failed",
        `<p>${current.email}: one portrait was delivered at native resolution after ${attempts} failed upscales.</p>`,
        current.storeId,
      );
    }
    const latest = (await store.getOrder(orderId))!;
    const latestMeta = latest.productMeta!.freePreview!;
    await store.updateOrder(orderId, {
      generationCostGbp: Math.round((latest.generationCostGbp + entry.costGbp) * 10000) / 10000,
      productMeta: { ...latest.productMeta, freePreview: { ...latestMeta, upscaled: { ...latestMeta.upscaled, [asset.id]: entry } } },
    });
  }
  return { ready: true };
}

/** Retry deliveries that were waiting on the spend cap, fal credit or a transient upscale error. */
export async function retryWaitingPreviewDeliveries() {
  const store = getStore();
  const orders = await store.listOrders("pawtraitry");
  const waiting = orders.filter(
    (o) => o.productMeta?.freePreview && o.status === "generating" && o.failureReason === WAITING_FOR_UPSCALE && o.processedSessions.length > 0,
  );
  const { deliverOrder } = await import("@/lib/generation");
  for (const order of waiting) {
    try {
      await deliverOrder(order.id);
    } catch (error) {
      console.error(`[preview-upscale] retry failed for ${order.id}`, error);
    }
  }
  return waiting.length;
}
