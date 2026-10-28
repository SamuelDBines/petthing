import { randomUUID } from "crypto";
import { EXTRA_IMAGES_PER_STYLE, getTier, perStyleCounts, type Tier } from "@/config/pricing";
import { loadStoreConfig } from "@/lib/tenant/context";
import { getTheme } from "@/config/themes";
import { buildPrompt } from "@/config/stylePrompts";
import type { Job, Order } from "@/lib/domain";
import { deleteBlob, putBlob, readBlob, signedBlobUrl } from "@/lib/blobs";
import { alertAdmin, resultsEmail, reviewReadyEmail, sendEmail } from "@/lib/email";
import { getImageProvider } from "@/lib/imageProvider";
import { moderateImage } from "@/lib/moderation";
import { londonDay, manualReviewEnabled, maxDailySpendGbp } from "@/lib/runtime";
import { mediaSigningBase, storeCanonicalOrigin } from "@/lib/tenant/origin";
import { isGenerationOutputRetryError } from "@/lib/fal/image-output";
import { isFalProviderError } from "@/lib/fal/provider-errors";
import { flagOrderPhotoSafetyReview, orderNeedsPhotoSafetyReview } from "@/lib/order-photo-review";
import { isTransientError } from "@/lib/transientErrors";
import {
  FAL_POLL_INTERVAL_MS,
  retryDelayMs,
} from "@/lib/queue";
import {
  generationSemaphore,
  GLOBAL_JOB_CONCURRENCY,
  ORDER_JOB_CONCURRENCY,
} from "@/lib/generation/concurrency";
import {
  countResultImages,
  jobsNeedingResults,
  orderHasFullPortraitSet,
  portraitGenerationProgress,
} from "@/lib/generation/progress";
import { getStore } from "@/lib/store";
import { watermark } from "@/lib/watermark";

const MAX_ATTEMPTS = 3;
/** Paid fal queue submits allowed per portrait job (accepted request_id only). */
export const MAX_FAL_PAID_SUBMITS_PER_JOB = 2;
const INLINE_QUEUE_POLL_MS = 60_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function orderPublicUrls(order: Order) {
  const config = await loadStoreConfig(order.storeId);
  const origin = storeCanonicalOrigin(order.storeId, config.brand, config.domains);
  return {
    origin,
    mediaBase: mediaSigningBase(origin),
    appName: config.brand.appName,
  };
}

async function tierForOrder(order: Order): Promise<Tier> {
  const config = await loadStoreConfig(order.storeId);
  return getTier(order.tierId, config.catalog.tiers);
}

function seedFrom(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % 1_000_000;
}

async function halt(reason: string, storeId: string) {
  const store = getStore();
  const settings = await store.getSettings(storeId);
  const today = londonDay();
  await store.updateSettings({ queueHalted: true, haltReason: reason, haltNotifiedOn: today }, storeId);
  if (settings.haltNotifiedOn !== today) {
    await alertAdmin(
      "Generation queue halted",
      `<p>${reason}</p><p>Open admin and switch the queue back on after you have checked it.</p>`,
      storeId,
    );
  }
}

export async function enqueuePlan(orderId: string, plan: { styleId: string; count: number }[], bonus = false) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) throw new Error("Order not found");
  const existing = await store.listJobs(orderId);
  const now = new Date().toISOString();
  const jobs: Job[] = [];
  for (const item of plan) {
    const used = existing.filter((job) => job.styleId === item.styleId).map((job) => job.variantIndex);
    let nextIndex = used.length ? Math.max(...used) + 1 : 0;
    for (let count = 0; count < item.count; count += 1) {
      jobs.push({
        id: randomUUID(),
        orderId,
        styleId: item.styleId,
        variantIndex: nextIndex,
        status: "queued",
        attempts: 0,
        providerRequestId: null,
        lastError: null,
        costGbp: 0,
        priority: order.priority,
        lockedUntil: null,
        nextRunAt: null,
        createdAt: now,
        updatedAt: now,
      });
      nextIndex += 1;
    }
  }
  await store.addJobs(jobs);
  const patch: Partial<Order> = {};
  if (order.status !== "delivered" && order.status !== "refunded") {
    patch.status = "generating";
    patch.failureReason = null;
  }
  if (bonus) patch.pendingBonusEmail = true;
  if (Object.keys(patch).length) await store.updateOrder(orderId, patch);
}

export async function enqueueForOrder(order: Order) {
  const tier = await tierForOrder(order);
  const counts = perStyleCounts(tier.imageCount, order.styleIds.length);
  await enqueuePlan(
    order.id,
    order.styleIds.map((styleId, index) => ({ styleId, count: counts[index] ?? 1 })),
  );
}

export async function deliverOrder(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status === "refunded" || order.status === "delivered") return;
  const tier = await tierForOrder(order);
  const [jobs, assets] = await Promise.all([store.listJobs(orderId), store.listAssets(orderId)]);
  if (!orderHasFullPortraitSet(tier, jobs, assets)) {
    const generated = countResultImages(assets);
    throw new Error(`Cannot deliver: only ${generated} of ${tier.imageCount} portraits are ready.`);
  }
  const { isJinglefoldPersonalisedPhysical, submitJinglefoldPhysicalOrder } = await import(
    "@/lib/jinglefold/fulfillment"
  );
  if (isJinglefoldPersonalisedPhysical(order)) {
    try {
      await submitJinglefoldPhysicalOrder(order);
    } catch {
      return;
    }
  }
  for (const asset of assets.filter((item) => item.kind === "result")) {
    const previewPath = `${orderId}/previews/${asset.id}.jpg`;
    if (assets.some((item) => item.storagePath === previewPath)) continue;
    const file = await readBlob(asset.bucket, asset.storagePath);
    if (!file) continue;
    const preview = await watermark(file.bytes);
    await putBlob("results", previewPath, preview, "image/jpeg");
    await store.addAsset({
      id: randomUUID(),
      orderId,
      kind: "preview",
      styleId: asset.styleId,
      variantIndex: asset.variantIndex,
      storagePath: previewPath,
      bucket: "results",
      contentType: "image/jpeg",
      moderation: "passed",
      createdAt: new Date().toISOString(),
    });
  }
  const now = new Date();
  await store.updateOrder(orderId, {
    status: "delivered",
    deliveredAt: now.toISOString(),
    photosDeleteAfter: new Date(now.getTime() + (order.offer === "season_pass" ? 365 : 7) * 24 * 60 * 60 * 1000).toISOString(),
    resultsDeleteAfter: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    failureReason: null,
  });
  const { origin, appName } = await orderPublicUrls(order);
  await sendEmail({
    to: order.email,
    subject: `Your ${appName} portraits are ready`,
    html: resultsEmail(`${origin}/results/${order.resultsToken}`),
  });
}

async function finishIfDone(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status === "refunded") return;
  if (
    order.status !== "generating" &&
    !(order.status === "delivered" && order.pendingBonusEmail)
  ) {
    return;
  }
  const jobs = await store.listJobs(orderId);
  const settled = (status: Job["status"]) => status === "done" || status === "failed" || status === "dead";
  if (jobs.some((job) => !settled(job.status))) return;
  const tier = await tierForOrder(order);
  const assets = await store.listAssets(orderId);
  const progress = portraitGenerationProgress(tier, jobs, assets);
  const failed = jobs.some((job) => job.status === "failed" || job.status === "dead");
  if (failed) {
    if (order.status === "delivered") {
      await alertAdmin(
        "An extra style failed",
        `<p>${order.email} still has their original gallery. A later style failed.</p>`,
        order.storeId,
      );
    } else {
      await store.updateOrder(orderId, { status: "failed", failureReason: "A portrait failed after three attempts." });
      await alertAdmin(
        "Generation failed",
        `<p>${order.email} needs a regenerate or a refund.</p>`,
        order.storeId,
      );
    }
    return;
  }
  if (!progress.complete) {
    await store.updateOrder(orderId, {
      status: "review",
      failureReason: `Only ${progress.generated} of ${progress.expected} portraits generated`,
    });
    const { origin } = await orderPublicUrls(order);
    await alertAdmin(
      "Portrait order incomplete",
      `<p>${order.email}: ${progress.generated}/${progress.expected} images. Regenerate missing before approval.</p><p><a href="${origin}/admin">Admin</a></p>`,
      order.storeId,
    );
    return;
  }
  if (order.status === "delivered") {
    if (order.pendingBonusEmail) {
      const { origin, appName } = await orderPublicUrls(order);
      await sendEmail({
        to: order.email,
        subject: `Your extra ${appName} style is ready`,
        html: resultsEmail(`${origin}/results/${order.resultsToken}`),
      });
      await store.updateOrder(orderId, { pendingBonusEmail: false });
    }
    return;
  }
  if (order.storeId === "jinglefold" && order.productMeta?.personalised && order.status === "generating") {
    const assets = await store.listAssets(orderId);
    for (const asset of assets.filter((item) => item.kind === "result")) {
      const previewPath = `${orderId}/previews/${asset.id}.jpg`;
      if (assets.some((item) => item.storagePath === previewPath)) continue;
      const file = await readBlob(asset.bucket, asset.storagePath);
      if (!file) continue;
      const preview = await watermark(file.bytes);
      await putBlob("results", previewPath, preview, "image/jpeg");
      await store.addAsset({
        id: randomUUID(),
        orderId,
        kind: "preview",
        styleId: asset.styleId,
        variantIndex: asset.variantIndex,
        storagePath: previewPath,
        bucket: "results",
        contentType: "image/jpeg",
        moderation: "passed",
        createdAt: new Date().toISOString(),
      });
    }
    await store.updateOrder(orderId, { status: "pending_payment", failureReason: null });
    return;
  }
  if (orderNeedsPhotoSafetyReview(order) || manualReviewEnabled()) {
    await store.updateOrder(orderId, { status: "review", failureReason: null });
    const { origin } = await orderPublicUrls(order);
    const subject = orderNeedsPhotoSafetyReview(order)
      ? "Order needs manual photo review (safety check deferred)"
      : "Order ready for review";
    await alertAdmin(subject, reviewReadyEmail(`${origin}/admin`, order.email), order.storeId);
    return;
  }
  await deliverOrder(orderId);
}

async function loadJob(jobId: string, orderId?: string) {
  const store = getStore();
  const jobs = await store.listJobs(orderId);
  return jobs.find((item) => item.id === jobId) ?? null;
}

async function processJob(jobId: string) {
  const store = getStore();
  let job = await loadJob(jobId);
  const order = job ? await store.getOrder(job.orderId) : null;
  if (!job || !order) return;
  const tier = await tierForOrder(order);
  const { mediaBase } = await orderPublicUrls(order);
  const provider = getImageProvider();
  try {
    job = (await loadJob(jobId, order.id)) ?? job;
    let requestId = job.providerRequestId;
    let queueMeta: { statusUrl: string; responseUrl: string } | null = job.providerMeta ?? null;
    if (!requestId) {
      job = (await loadJob(jobId, order.id)) ?? job;
      if (job.providerRequestId) {
        requestId = job.providerRequestId;
        queueMeta = job.providerMeta ?? null;
      }
    }
    if (!requestId) {
      const paidSubmits = job.falPaidSubmits ?? 0;
      if (provider.id !== "placeholder" && paidSubmits >= MAX_FAL_PAID_SUBMITS_PER_JOB) {
        await store.updateJob(job.id, {
          status: "dead",
          lastError: `fal paid submission cap (${MAX_FAL_PAID_SUBMITS_PER_JOB}) reached for this portrait`,
        });
        return;
      }
      const { prompt, negative } = buildPrompt({
        styleId: job.styleId,
        subject: order.subjectType,
        variantIndex: job.variantIndex,
        quality: tier.quality,
        forFalKontext: provider.id !== "placeholder",
      });
      const uploads = (await store.listAssets(order.id)).filter((asset) => asset.kind === "upload");
      const imageUrls: string[] = [];
      for (const asset of uploads) {
        imageUrls.push(await signedBlobUrl(asset.bucket, asset.storagePath, 60 * 60, false, mediaBase));
      }
      if (provider.id !== "placeholder" && imageUrls.length === 0) throw new Error("This order has no photos left to reference");
      const submitted = await provider.submit({
        prompt,
        negativePrompt: negative,
        imageUrls,
        quality: tier.quality,
        seed: seedFrom(`${job.id}:${job.attempts}:${paidSubmits}`),
      });
      if (!submitted.requestId) throw new Error("fal did not accept the generation request");
      requestId = submitted.requestId;
      queueMeta = submitted.providerMeta;
      await store.updateJob(job.id, {
        providerRequestId: requestId,
        providerMeta: queueMeta,
        status: "submitted",
        falPaidSubmits: provider.id !== "placeholder" ? paidSubmits + 1 : paidSubmits,
      });
    }
    const polled = await provider.poll(requestId, queueMeta);
    if (polled.state === "pending") {
      await store.updateJob(job.id, {
        status: "submitted",
        lockedUntil: null,
        nextRunAt: new Date(Date.now() + FAL_POLL_INTERVAL_MS).toISOString(),
      });
      return;
    }
    if (polled.state === "failed") throw new Error(polled.error);
    let cost = polled.costGbp;
    if (polled.costGbp) await store.addSpend(polled.costGbp, order.storeId);
    for (const image of polled.images) {
      const moderation = await moderateImage(image.bytes, image.contentType);
      if (moderation.costGbp) {
        cost += moderation.costGbp;
        await store.addSpend(moderation.costGbp, order.storeId);
      }
      if (moderation.failOpen) await flagOrderPhotoSafetyReview(order.id);
      if (!moderation.allowed) throw new Error(moderation.customerMessage);
      const extension = image.contentType.includes("png") ? "png" : "jpg";
      const storagePath = `${order.id}/results/${job.styleId}-${job.variantIndex}.${extension}`;
      await putBlob("results", storagePath, image.bytes, image.contentType);
      await store.addAsset({
        id: randomUUID(),
        orderId: order.id,
        kind: "result",
        styleId: job.styleId,
        variantIndex: job.variantIndex,
        storagePath,
        bucket: "results",
        contentType: image.contentType,
        moderation: moderation.skipped ? "skipped" : "passed",
        createdAt: new Date().toISOString(),
      });
    }
    const fresh = await store.getOrder(order.id);
    await store.updateOrder(order.id, {
      generationCostGbp: Math.round(((fresh?.generationCostGbp ?? 0) + cost) * 10000) / 10000,
    });
    await store.updateJob(job.id, { status: "done", costGbp: cost, lastError: null, lockedUntil: null, nextRunAt: null });
    const spent = await store.todaySpend(order.storeId);
    if (spent >= maxDailySpendGbp()) {
      await halt(`Daily generation spend reached £${spent.toFixed(2)} (limit £${maxDailySpendGbp().toFixed(2)}).`, order.storeId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const outputRetry = isGenerationOutputRetryError(error);
    const transient = isTransientError(error) || isFalProviderError(error);
    const attempts = transient || outputRetry ? job.attempts : job.attempts + 1;
    const dead = !transient && !outputRetry && attempts >= MAX_ATTEMPTS;
    const backoff = retryDelayMs(transient ? Math.min(attempts, 3) : attempts) * (transient ? 2 : 1);
    const keepRequest = transient && !outputRetry;
    const retrySoon = outputRetry ? FAL_POLL_INTERVAL_MS : backoff;
    await store.updateJob(job.id, {
      status: dead ? "dead" : "queued",
      attempts,
      lastError: message,
      providerRequestId: keepRequest ? job.providerRequestId : null,
      providerMeta: keepRequest ? job.providerMeta ?? null : null,
      lockedUntil: null,
      nextRunAt: dead ? null : new Date(Date.now() + retrySoon).toISOString(),
    });
  }
  await finishIfDone(order.id);
}

async function drainJobWithPolling(jobId: string, orderId: string) {
  const deadline = Date.now() + INLINE_QUEUE_POLL_MS;
  while (Date.now() < deadline) {
    if ((await getStore().todaySpend()) >= maxDailySpendGbp()) break;
    await processJob(jobId);
    const fresh = await loadJob(jobId, orderId);
    if (!fresh || fresh.status === "done" || fresh.status === "dead" || fresh.status === "queued") break;
    if (fresh.status === "submitted") {
      const waitUntil = fresh.nextRunAt ? Date.parse(fresh.nextRunAt) : Date.now() + FAL_POLL_INTERVAL_MS;
      const wait = Math.min(Math.max(0, waitUntil - Date.now()), deadline - Date.now());
      if (wait > 0) await sleep(wait);
      continue;
    }
    break;
  }
}

async function processClaimedJobsParallel(claimed: Job[]) {
  if (!claimed.length) return;
  const byOrder = new Map<string, Job[]>();
  for (const job of claimed) {
    const list = byOrder.get(job.orderId) ?? [];
    list.push(job);
    byOrder.set(job.orderId, list);
  }
  await Promise.all(
    [...byOrder.values()].map(async (jobs) => {
      for (let offset = 0; offset < jobs.length; offset += ORDER_JOB_CONCURRENCY) {
        const slice = jobs.slice(offset, offset + ORDER_JOB_CONCURRENCY);
        await Promise.all(
          slice.map((job) => generationSemaphore.run(() => drainJobWithPolling(job.id, job.orderId))),
        );
      }
    }),
  );
}

async function runQueueInternal(options?: { limit?: number; orderId?: string }) {
  const store = getStore();
  const settings = await store.getSettings();
  if (settings.queueHalted) return { processed: 0, halted: true, reason: settings.haltReason };
  if ((await store.todaySpend()) >= maxDailySpendGbp()) {
    await halt(`Daily generation spend is already over £${maxDailySpendGbp().toFixed(2)}.`, "pawtraitry");
    return { processed: 0, halted: true, reason: "spend cap" };
  }
  let processed = 0;
  if (options?.orderId) {
    for (let round = 0; round < 24; round += 1) {
      const claimed = await store.claimJobsForOrder(options.orderId, ORDER_JOB_CONCURRENCY);
      if (!claimed.length) break;
      processed += claimed.length;
      await processClaimedJobsParallel(claimed);
    }
    return { processed, halted: false, reason: null };
  }
  const limit = options?.limit ?? (process.env.VERCEL ? GLOBAL_JOB_CONCURRENCY : GLOBAL_JOB_CONCURRENCY);
  const claimed = await store.claimJobs(limit);
  processed = claimed.length;
  await processClaimedJobsParallel(claimed);
  return { processed, halted: false, reason: null };
}

/** Start generation immediately for one order (parallel fal submits + polling). */
export async function kickOrderGeneration(orderId: string) {
  return runQueueInternal({ orderId });
}

export function scheduleOrderGeneration(orderId: string) {
  void kickOrderGeneration(orderId).catch((error) => {
    console.error(`[generation] kick failed for order ${orderId}`, error);
  });
}

export async function runQueue(limit = GLOBAL_JOB_CONCURRENCY) {
  return runQueueInternal({ limit });
}

export async function regenerateMissingPortraits(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) throw new Error("Order not found");
  const jobs = await store.listJobs(orderId);
  const assets = await store.listAssets(orderId);
  const missing = jobsNeedingResults(jobs, assets);
  if (!missing.length) throw new Error("All expected portraits already exist");
  for (const row of missing) {
    await store.updateJob(row.id, {
      status: "queued",
      attempts: 0,
      providerRequestId: null,
      providerMeta: null,
      falPaidSubmits: 0,
      lastError: null,
      lockedUntil: null,
      nextRunAt: null,
    });
  }
  await store.updateOrder(orderId, { status: "generating", failureReason: null });
}

export async function regeneratePortraitVariant(orderId: string, styleId: string, variantIndex: number) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) throw new Error("Order not found");
  const theme = getTheme(order.themeId);
  if (!theme?.styles.some((style) => style.id === styleId)) throw new Error("That style is not on this theme");
  const jobs = await store.listJobs(orderId);
  const job = jobs.find((row) => row.styleId === styleId && row.variantIndex === variantIndex);
  if (!job) throw new Error("No generation job for that style and variant");
  const assets = await store.listAssets(orderId);
  const doomed = assets.filter(
    (asset) =>
      asset.styleId === styleId &&
      asset.variantIndex === variantIndex &&
      asset.kind !== "upload",
  );
  for (const asset of doomed) await deleteBlob(asset.bucket, asset.storagePath);
  await store.deleteAssets(doomed.map((asset) => asset.id));
  await store.updateJob(job.id, {
    status: "queued",
    attempts: 0,
    providerRequestId: null,
    providerMeta: null,
    falPaidSubmits: 0,
    lastError: null,
    lockedUntil: null,
    nextRunAt: null,
  });
  await store.updateOrder(orderId, { status: "generating", failureReason: null });
}

export async function regenerateStyle(orderId: string, styleId: string) {
  const store = getStore();
  const theme = getTheme((await store.getOrder(orderId))?.themeId || "");
  if (!theme?.styles.some((style) => style.id === styleId)) throw new Error("That style is not on this theme");
  const assets = await store.listAssets(orderId);
  const doomed = assets.filter((asset) => asset.styleId === styleId && asset.kind !== "upload");
  for (const asset of doomed) await deleteBlob(asset.bucket, asset.storagePath);
  await store.deleteAssets(doomed.map((asset) => asset.id));
  const jobs = (await store.listJobs(orderId)).filter((job) => job.styleId === styleId);
  if (!jobs.length) {
    await enqueuePlan(orderId, [{ styleId, count: EXTRA_IMAGES_PER_STYLE }]);
    return;
  }
  for (const job of jobs) {
    await store.updateJob(job.id, {
      status: "queued",
      attempts: 0,
      providerRequestId: null,
      providerMeta: null,
      falPaidSubmits: 0,
      lastError: null,
      lockedUntil: null,
      nextRunAt: null,
    });
  }
  await store.updateOrder(orderId, { status: "generating", failureReason: null });
}
