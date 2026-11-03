import { randomUUID } from "crypto";
import { z } from "zod";
import {
  CUSTOM_STYLE_ID,
  PREVIEW_STYLES,
  STUDIO_THEME_ID,
  cleanCustomPrompt,
  previewStyleById,
} from "@/config/preview-styles";
import { DIGITAL_INCLUDED_TIER, DIGITAL_PACK_TIER, FREE_PREVIEWS_PER_EMAIL } from "@/config/pricing";
import { allPrintProductIds } from "@/config/prints";
import { BANNED_PROMPT_TERMS } from "@/config/stylePrompts";
import { getCatalog } from "@/lib/catalog";
import type { Order } from "@/lib/domain";
import { enqueuePlan, scheduleOrderGeneration } from "@/lib/generation";
import { cleanUtm, jsonError, parseBody } from "@/lib/http";
import { requestHostFromRequest } from "@/lib/http/request-host";
import {
  normalizePhysicalBasket,
  orderAmountPence,
  type PawtraitryPhysicalBasketLine,
} from "@/lib/pawtraitry/create-basket";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, hashIp, referralCode } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";
import { signedBlobUrl } from "@/lib/blobs";
import { mediaSigningBase, storeCanonicalOrigin } from "@/lib/tenant/origin";
import { loadStoreConfig } from "@/lib/tenant/context";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

function envLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Caps for free generation. fal spend is also capped by MAX_DAILY_GEN_SPEND_GBP in the queue. */
export function freePreviewLimits() {
  return {
    perEmail: FREE_PREVIEWS_PER_EMAIL,
    perIpPerDay: envLimit("FREE_PREVIEWS_PER_IP_PER_DAY", 9),
    perDayGlobal: envLimit("FREE_PREVIEWS_PER_DAY", 400),
  };
}

function emailKey(email: string) {
  return hashIp(`email:${email.trim().toLowerCase()}`);
}

const createSchema = z.object({
  email: z.string().email().max(200),
  subjectType: z.enum(["pet", "family", "couple", "me"]).default("pet"),
  photoConsent: z.literal(true),
  utm: z.record(z.string(), z.string()).optional(),
});

/** Start a free-preview session: captures the email first, returns an upload token. */
export async function POST(request: Request) {
  const parsed = parseBody(createSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await requestStoreId();
  if (storeId !== "pawtraitry") return jsonError("Free previews are not available here.", 404);
  const store = getStore();
  const ipHash = hashIp(clientIp(request));
  const limit = await store.hitRateLimit(`order:${storeId}:${ipHash}`, rateLimits().ordersPerHour, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many attempts from this connection. Try again in an hour.", 429);

  const { settings, config } = await getCatalog(storeId);
  if (settings.salesPaused) return jsonError("New orders are paused for a moment. Please check back shortly.", 409);

  const email = parsed.data.email.trim().toLowerCase();
  const used = await previewsUsedByEmail(email);
  if (used >= FREE_PREVIEWS_PER_EMAIL) {
    return jsonError(`You have used your ${FREE_PREVIEWS_PER_EMAIL} free previews for this email.`, 429);
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    storeId,
    createdAt: now,
    email,
    themeId: STUDIO_THEME_ID,
    subjectType: parsed.data.subjectType,
    tierId: DIGITAL_PACK_TIER.id,
    styleIds: [],
    cardNames: "",
    status: "pending_payment",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: DIGITAL_PACK_TIER.pricePence,
    priority: false,
    consentAt: now,
    digitalSupplyConsentAt: "",
    utm: cleanUtm(parsed.data.utm),
    referralCodeUsed: null,
    ownReferralCode: referralCode(config.brand.referralPrefix),
    resultsToken: randomUUID(),
    uploadToken: randomUUID(),
    generationCostGbp: 0,
    deliveredAt: null,
    photosDeleteAfter: null,
    resultsDeleteAfter: null,
    ipHash,
    uploadsDeletedAt: null,
    resultsDeletedAt: null,
    failureReason: null,
    processedSessions: [],
    referralRewardGranted: false,
    pendingBonusEmail: false,
    offer: "one_off",
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    payments: [],
    productMeta: { freePreview: { customPrompts: {}, chosenAssetId: null, path: null } },
  };
  await store.createOrder(order);
  const { recordEmailSignup } = await import("@/lib/crm/record-signup");
  await recordEmailSignup({
    storeId,
    email,
    source: "free_preview",
    marketingConsent: false,
    utm: order.utm,
    requestHost: requestHostFromRequest(request),
    stripeLivemode: false,
  });
  return Response.json({
    orderId: order.id,
    uploadToken: order.uploadToken,
    previewsLeft: FREE_PREVIEWS_PER_EMAIL - used,
  });
}

/** Counts preview jobs across every free-preview order for this email (server side quota). */
async function previewsUsedByEmail(email: string) {
  const store = getStore();
  const orders = (await store.listOrders("pawtraitry")).filter(
    (order) => order.email === email && order.productMeta?.freePreview,
  );
  let count = 0;
  for (const order of orders) count += (await store.listJobs(order.id)).length;
  return count;
}

const generateSchema = z.object({
  orderId: z.string().uuid(),
  uploadToken: z.string().min(10),
  styleId: z.string().min(1).max(40),
  customPrompt: z.string().max(400).optional(),
});

/** Generate one free watermarked preview. */
export async function PATCH(request: Request) {
  const parsed = parseBody(generateSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await requestStoreId();
  if (storeId !== "pawtraitry") return jsonError("Free previews are not available here.", 404);
  const store = getStore();
  const order = await store.getOrderByUploadToken(parsed.data.orderId, parsed.data.uploadToken);
  if (!order || order.storeId !== storeId || !order.productMeta?.freePreview) return jsonError("Start again from the form.", 404);
  if (order.status !== "pending_payment") return jsonError("Wait for the current preview to finish.", 409);
  const style = previewStyleById(parsed.data.styleId);
  if (!style) return jsonError("Choose one of the styles.");
  let customPrompt: string | null = null;
  if (style.id === CUSTOM_STYLE_ID) {
    customPrompt = cleanCustomPrompt(parsed.data.customPrompt, [...BANNED_PROMPT_TERMS]);
    if (!customPrompt) return jsonError("Describe the picture in a few words. Keep it family friendly and leave out brands and characters.");
  }
  const uploads = (await store.listAssets(order.id)).filter((asset) => asset.kind === "upload");
  if (!uploads.length) return jsonError("Upload a photo first.");

  const limits = freePreviewLimits();
  const jobs = await store.listJobs(order.id);
  if (jobs.length >= limits.perEmail) return jsonError(`That is your ${limits.perEmail} free previews.`, 429);
  const used = await previewsUsedByEmail(order.email);
  if (used >= limits.perEmail) return jsonError(`You have used your ${limits.perEmail} free previews for this email.`, 429);
  const ipHash = hashIp(clientIp(request));
  const ipLimit = await store.hitRateLimit(`preview:ip:${ipHash}`, limits.perIpPerDay, DAY);
  if (!ipLimit.ok) return jsonError("Too many free previews from this connection today. Try again tomorrow.", 429);
  const emailLimit = await store.hitRateLimit(`preview:email:${emailKey(order.email)}`, limits.perEmail, THIRTY_DAYS);
  if (!emailLimit.ok) return jsonError(`You have used your ${limits.perEmail} free previews for this email.`, 429);
  const globalLimit = await store.hitRateLimit("preview:global", limits.perDayGlobal, DAY);
  if (!globalLimit.ok) return jsonError("Free previews are busy today. Please try again tomorrow.", 429);

  const variantIndex = jobs.filter((job) => job.styleId === style.id).length;
  const meta = order.productMeta.freePreview;
  await store.updateOrder(order.id, {
    styleIds: Array.from(new Set([...order.styleIds, style.id])),
    productMeta: {
      ...order.productMeta,
      freePreview: {
        ...meta,
        customPrompts: customPrompt
          ? { ...(meta.customPrompts ?? {}), [String(variantIndex)]: customPrompt }
          : meta.customPrompts ?? {},
      },
    },
  });
  await enqueuePlan(order.id, [{ styleId: style.id, count: 1 }]);
  scheduleOrderGeneration(order.id);
  return Response.json({ ok: true, previewsLeft: Math.max(0, limits.perEmail - used - 1) });
}

/** Poll previews. Only watermarked low-res URLs are returned before payment. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const uploadToken = url.searchParams.get("uploadToken") ?? "";
  if (!z.string().uuid().safeParse(orderId).success || uploadToken.length < 10) return jsonError("Missing order.", 400);
  const store = getStore();
  const order = await store.getOrderByUploadToken(orderId, uploadToken);
  if (!order || !order.productMeta?.freePreview) return jsonError("Start again from the form.", 404);
  const config = await loadStoreConfig(order.storeId);
  const base = mediaSigningBase(storeCanonicalOrigin(order.storeId, config.brand, config.domains));
  const [jobs, assets] = await Promise.all([store.listJobs(order.id), store.listAssets(order.id)]);
  const previews = [];
  for (const job of jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const result = assets.find((a) => a.kind === "result" && a.styleId === job.styleId && a.variantIndex === job.variantIndex);
    const preview = result
      ? assets.find((a) => a.kind === "preview" && a.storagePath.endsWith(`${result.id}.jpg`))
      : undefined;
    const style = PREVIEW_STYLES.find((item) => item.id === job.styleId);
    previews.push({
      jobId: job.id,
      assetId: result?.id ?? null,
      styleId: job.styleId,
      styleName: style?.name ?? "Portrait",
      prompt: job.styleId === CUSTOM_STYLE_ID ? order.productMeta.freePreview.customPrompts?.[String(job.variantIndex)] ?? null : null,
      status: preview ? "ready" : job.status === "failed" || job.status === "dead" ? "failed" : "working",
      previewUrl: preview ? await signedBlobUrl(preview.bucket, preview.storagePath, 60 * 60 * 24, false, base) : null,
    });
  }
  return Response.json({
    status: order.status,
    waitingForCredit: order.status === "waiting_for_credit",
    previewsLeft: Math.max(0, FREE_PREVIEWS_PER_EMAIL - (await previewsUsedByEmail(order.email))),
    previews,
  });
}

const checkoutSchema = z.object({
  orderId: z.string().uuid(),
  uploadToken: z.string().min(10),
  path: z.enum(["digital", "physical"]),
  chosenAssetId: z.string().uuid().optional(),
  digitalSupplyConsent: z.literal(true),
  physicalLines: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
    .max(10)
    .optional(),
});

/** Set the customer's choice (digital pack, or physical with files included) before /api/checkout. */
export async function PUT(request: Request) {
  const parsed = parseBody(checkoutSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const order = await store.getOrderByUploadToken(parsed.data.orderId, parsed.data.uploadToken);
  if (!order || !order.productMeta?.freePreview) return jsonError("Start again from the form.", 404);
  if (order.status !== "pending_payment") return jsonError("Wait for your previews to finish.", 409);
  const assets = await store.listAssets(order.id);
  const results = assets.filter((a) => a.kind === "result");
  if (!results.length) return jsonError("Make at least one preview first.");
  const chosen = parsed.data.chosenAssetId ? results.find((a) => a.id === parsed.data.chosenAssetId) : results[results.length - 1];
  if (!chosen) return jsonError("Choose one of your previews.");

  let physical: PawtraitryPhysicalBasketLine[] = [];
  if (parsed.data.path === "physical") {
    const ids = allPrintProductIds() as string[];
    const lines = parsed.data.physicalLines ?? [];
    if (lines.some((line) => !ids.includes(line.productId))) return jsonError("One of those products is not available.");
    physical = normalizePhysicalBasket(lines as PawtraitryPhysicalBasketLine[]);
    if (!physical.length) return jsonError("Choose a product.");
  }
  const tier = parsed.data.path === "physical" ? DIGITAL_INCLUDED_TIER : DIGITAL_PACK_TIER;
  const amountPence = orderAmountPence({
    tier,
    offer: "one_off",
    seasonPassPence: 0,
    priority: false,
    referralDiscountPence: 0,
    physical,
  });
  const now = new Date().toISOString();
  await store.updateOrder(order.id, {
    tierId: tier.id,
    amountPence,
    digitalSupplyConsentAt: now,
    // The amount may have changed: never reuse an older open Stripe session.
    stripeCheckoutSessionId: null,
    productMeta: {
      ...order.productMeta,
      checkoutBasket: physical.length ? { physical } : undefined,
      freePreview: { ...order.productMeta.freePreview, chosenAssetId: chosen.id, path: parsed.data.path },
    },
  });
  return Response.json({ ok: true, amountPence });
}
