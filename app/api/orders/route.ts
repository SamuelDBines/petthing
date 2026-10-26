import { randomUUID } from "crypto";
import { z } from "zod";
import { CONSENT_LABEL } from "@/config/brand";
import { discountedPence, getTier, PRIORITY_PENCE, REFERRAL_DISCOUNT, SEASON_PASS, styleSlots } from "@/config/pricing";
import { getCatalog } from "@/lib/catalog";
import type { Order } from "@/lib/domain";
import { cleanUtm, jsonError, parseBody, utmSchema } from "@/lib/http";
import { clientIp, hashIp, referralCode } from "@/lib/runtime";
import { getStore } from "@/lib/store";

const schema = z.object({
  themeId: z.string().min(1),
  subjectType: z.enum(["pet", "family", "couple", "me"]),
  tierId: z.enum(["mini", "classic", "deluxe"]),
  styleIds: z.array(z.string()).min(1).max(12),
  cardNames: z.string().max(80).optional(),
  email: z.string().email("Enter a valid email"),
  consent: z.boolean().refine((value) => value, CONSENT_LABEL),
  priority: z.boolean(),
  offer: z.enum(["one_off", "season_pass"]).optional(),
  referralCode: z.string().max(40).optional(),
  utm: utmSchema.optional(),
});

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const store = getStore();
  const ipHash = hashIp(clientIp(request));
  const limit = await store.hitRateLimit(`order:${ipHash}`, 12, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many orders from this connection. Try again in an hour.", 429);

  const { settings, theme } = await getCatalog();
  if (settings.salesPaused) return jsonError("New orders are paused for a moment. Please check back shortly.", 409);
  if (input.themeId !== theme.id) return jsonError("That theme is not on sale.");
  const offer = input.offer ?? "one_off";
  if (offer === "season_pass" && input.subjectType !== "family") {
    return jsonError("The season pass is for a family or group.");
  }
  const tier = getTier(offer === "season_pass" ? SEASON_PASS.tierId : input.tierId);
  const slots = styleSlots(tier, theme.styles.length);
  const styleIds = tier.styleCount === "all" ? theme.styles.map((style) => style.id) : Array.from(new Set(input.styleIds));
  if (styleIds.length !== slots) return jsonError(`Choose ${slots} style${slots === 1 ? "" : "s"} for ${tier.name}.`);
  if (styleIds.some((id) => !theme.styles.some((style) => style.id === id))) return jsonError("One of those styles is not in this theme.");

  let discount = 0;
  let referralCodeUsed: string | null = null;
  if (input.referralCode) {
    const owner = await store.getOrderByReferralCode(input.referralCode.trim());
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
    utm: cleanUtm(input.utm),
    referralCodeUsed,
    ownReferralCode: referralCode(),
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
