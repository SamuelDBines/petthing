import { randomUUID } from "crypto";
import { isHandPaintedTierId } from "@/config/paintings";
import { discountedPence, getTier, PRIORITY_PENCE, REFERRAL_DISCOUNT, SEASON_PASS, styleSlots } from "@/config/pricing";
import { getCatalog } from "@/lib/catalog";
import type { Order } from "@/lib/domain";
import { cleanUtm, jsonError, parseBody } from "@/lib/http";
import { orderInputSchema, photoConsentGiven } from "@/lib/orderInput";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, hashIp, referralCode } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";
export async function POST(request: Request) {
  const parsed = parseBody(orderInputSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  if (!photoConsentGiven(input)) return jsonError("Photo permission is required.", 400);
  const store = getStore();
  const storeId = await requestStoreId();
  const ipHash = hashIp(clientIp(request));
  const limits = rateLimits();
  const limit = await store.hitRateLimit(`order:${storeId}:${ipHash}`, limits.ordersPerHour, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many orders from this connection. Try again in an hour.", 429);

  const { settings, theme, config } = await getCatalog(storeId);
  if (settings.salesPaused) return jsonError("New orders are paused for a moment. Please check back shortly.", 409);
  if (input.themeId !== theme.id) return jsonError("That theme is not on sale.");
  const offer = input.offer ?? "one_off";
  if (offer === "season_pass" && input.subjectType !== "family") {
    return jsonError("The season pass is for a family or group.");
  }
  const tier = getTier(offer === "season_pass" ? SEASON_PASS.tierId : input.tierId, config.catalog.tiers);
  const handPainted = isHandPaintedTierId(tier.id);
  const slots = handPainted ? 1 : styleSlots(tier, theme.styles.length);
  const styleIds = tier.styleCount === "all" ? theme.styles.map((style) => style.id) : Array.from(new Set(input.styleIds));
  if (styleIds.length !== slots) return jsonError(`Choose ${slots} style${slots === 1 ? "" : "s"} for ${tier.name}.`);
  if (!handPainted && styleIds.some((id) => !theme.styles.some((style) => style.id === id))) {
    return jsonError("One of those styles is not in this theme.");
  }

  let discount = 0;
  let referralCodeUsed: string | null = null;
  if (input.referralCode) {
    const owner = await store.getOrderByReferralCode(input.referralCode.trim(), storeId);
    if (!owner || owner.status !== "delivered") return jsonError("That referral code is not active yet.");
    discount = REFERRAL_DISCOUNT;
    referralCodeUsed = owner.ownReferralCode;
  }

  const priority = offer === "season_pass" ? false : input.priority;
  const basePence = offer === "season_pass" ? SEASON_PASS.pricePence : tier.pricePence;
  const amountPence = discountedPence(basePence, discount) + (priority ? PRIORITY_PENCE : 0);
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    storeId,
    createdAt: now,
    email: input.email.trim().toLowerCase(),
    themeId: theme.id,
    subjectType: input.subjectType,
    tierId: tier.id,
    styleIds,
    cardNames: input.cardNames?.trim() ?? "",
    status: "pending_payment",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence,
    priority,
    consentAt: now,
    digitalSupplyConsentAt: now,
    utm: cleanUtm(input.utm),
    referralCodeUsed,
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
    offer,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    payments: [],
  };
  await store.createOrder(order);
  return Response.json({ orderId: order.id, uploadToken: order.uploadToken, amountPence });
}
