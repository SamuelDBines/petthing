import { randomUUID } from "crypto";
import { z } from "zod";
import { JINGLEFOLD_PERSONALISED_CONSENT, jinglefoldPersonalisedBySlug } from "@/config/jinglefold";
import { getTier } from "@/config/pricing";
import { getCatalog } from "@/lib/catalog";
import type { Order } from "@/lib/domain";
import { enqueueForOrder, scheduleOrderGeneration } from "@/lib/generation";
import { jsonError, parseBody } from "@/lib/http";
import { requestHostFromRequest } from "@/lib/http/request-host";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, hashIp, referralCode } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";

const schema = z.object({
  productSlug: z.string().min(1),
  email: z.string().email(),
  styleId: z.string().min(1),
  subjectType: z.enum(["pet", "family", "couple", "me"]),
  photoConsent: z.boolean(),
  digitalSupplyConsent: z.boolean(),
  personalisedConsent: z.boolean(),
  lateDeliveryAck: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await requestStoreId();
  if (storeId !== "jinglefold") return jsonError("Wrong store.", 400);
  const product = jinglefoldPersonalisedBySlug(parsed.data.productSlug);
  if (!product) return jsonError("Unknown product.", 404);
  if (!parsed.data.photoConsent) return jsonError("Photo permission is required.", 400);
  if (!parsed.data.digitalSupplyConsent) return jsonError("Digital supply consent is required.", 400);
  if (!parsed.data.personalisedConsent) return jsonError(JINGLEFOLD_PERSONALISED_CONSENT, 400);

  const store = getStore();
  const ipHash = hashIp(clientIp(request));
  const limits = rateLimits();
  const limit = await store.hitRateLimit(`order:jinglefold:${ipHash}`, limits.ordersPerHour, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many orders from this connection. Try again in an hour.", 429);

  const { settings, theme, config } = await getCatalog(storeId);
  if (settings.salesPaused) return jsonError("New orders are paused for a moment.", 409);
  if (!theme.styles.some((s) => s.id === parsed.data.styleId)) return jsonError("Choose a valid style.");
  const tier = getTier(product.id, config.catalog.tiers);

  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    storeId,
    createdAt: now,
    email: parsed.data.email.trim().toLowerCase(),
    themeId: theme.id,
    subjectType: parsed.data.subjectType,
    tierId: tier.id,
    styleIds: [parsed.data.styleId],
    cardNames: "",
    status: "pending_payment",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: tier.pricePence,
    priority: false,
    consentAt: now,
    digitalSupplyConsentAt: now,
    utm: {},
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
    productMeta: {
      pricingSku: product.pricingSku,
      personalised: true,
      lateDeliveryAckAt: parsed.data.lateDeliveryAck ? now : undefined,
    },
  };
  await store.createOrder(order);
  const { recordEmailSignup } = await import("@/lib/crm/record-signup");
  await recordEmailSignup({
    storeId,
    email: order.email,
    source: "jinglefold_preview",
    marketingConsent: false,
    requestHost: requestHostFromRequest(request),
    stripeLivemode: false,
  });
  return Response.json({
    orderId: order.id,
    uploadToken: order.uploadToken,
    resultsToken: order.resultsToken,
    amountPence: order.amountPence,
  });
}

const finishSchema = z.object({
  orderId: z.string().uuid(),
  uploadToken: z.string().min(10),
});

export async function PATCH(request: Request) {
  const parsed = parseBody(finishSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await requestStoreId();
  if (storeId !== "jinglefold") return jsonError("Wrong store.", 400);
  const store = getStore();
  const order = await store.getOrderByUploadToken(parsed.data.orderId, parsed.data.uploadToken);
  if (!order || order.storeId !== "jinglefold") return jsonError("Order not found.", 404);
  const uploads = (await store.listAssets(order.id)).filter((a) => a.kind === "upload");
  if (!uploads.length) return jsonError("Upload at least one photo first.");
  await store.updateOrder(order.id, { status: "generating" });
  await enqueueForOrder(order);
  scheduleOrderGeneration(order.id);
  return Response.json({ resultsToken: order.resultsToken, status: "generating" });
}
