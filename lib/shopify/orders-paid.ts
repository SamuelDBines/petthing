import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { CUSTOM_STYLE_ID, PREVIEW_STYLES, STUDIO_THEME_ID, cleanCustomPrompt } from "@/config/preview-styles";
import { DIGITAL_INCLUDED_TIER, DIGITAL_PACK_TIER } from "@/config/pricing";
import type { PrintProductId } from "@/config/prints";
import { BANNED_PROMPT_TERMS } from "@/config/stylePrompts";
import type { Order, Shipping } from "@/lib/domain";

/** Shopify variant SKU (Prodigi code) to our internal print product id. */
export const SHOPIFY_SKU_TO_PRINT: Record<string, PrintProductId> = {
  "GLOBAL-CFPM-A3-BLACK": "cfpm_a3_black",
  "GLOBAL-CFPM-A3-WHITE": "cfpm_a3_white",
  "GLOBAL-CFPM-A3-NATURAL": "cfpm_a3_natural",
  "GLOBAL-CFPM-A2-BLACK": "cfpm_a2_black",
  "GLOBAL-CFPM-A2-WHITE": "cfpm_a2_white",
  "GLOBAL-CFPM-A2-NATURAL": "cfpm_a2_natural",
  "GLOBAL-CFPM-A1-BLACK": "cfpm_a1_black",
  "GLOBAL-CFPM-A1-WHITE": "cfpm_a1_white",
  "GLOBAL-CFPM-A1-NATURAL": "cfpm_a1_natural",
  "PT-PRINT-A2": "poster_a2_matte",
  "GLOBAL-MUG-W": "mug_11oz_white",
  "GLOBAL-CUSH-18X18-SUE": "cushion_18_suede",
  "CLASSIC-GRE-FEDR-A5-BLA": "greeting_card_a5",
  "H-COAST-4PK": "coasters_4pk",
} as Record<string, PrintProductId>;
export const SHOPIFY_DIGITAL_SKU = "PT-DIGITAL";

export function verifyShopifyHmac(rawBody: string, header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let given: Buffer;
  try {
    given = Buffer.from(header, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type ShopifyProp = { name: string; value: string };
export type ShopifyLineItem = { id: number | string; sku?: string | null; quantity: number; title?: string; properties?: ShopifyProp[] | null };
export type ShopifyOrderPayload = {
  id: number | string;
  name?: string;
  email?: string | null;
  contact_email?: string | null;
  financial_status?: string;
  test?: boolean;
  total_price?: string;
  shipping_address?: {
    first_name?: string; last_name?: string; name?: string; address1?: string; address2?: string | null;
    city?: string; zip?: string; country_code?: string;
  } | null;
  line_items: ShopifyLineItem[];
};

export type PortraitGroup = {
  key: string;
  photoUrl: string;
  styleId: string;
  customPrompt: string | null;
  petName: string;
  digital: boolean;
  physical: { productId: PrintProductId; quantity: number }[];
  lineIds: string[];
  unknownSkus: string[];
};

export function styleIdFromLabel(label: string | undefined) {
  const clean = (label ?? "").trim().toLowerCase();
  if (clean === "describe your own") return CUSTOM_STYLE_ID;
  return PREVIEW_STYLES.find((style) => style.name.toLowerCase() === clean)?.id ?? null;
}

function prop(line: ShopifyLineItem, name: string) {
  return (line.properties ?? []).find((p) => p.name === name)?.value?.toString().trim() ?? "";
}

/** One portrait per distinct (photo, style, custom text). Lines without a photo are ignored. */
export function groupPortraitLines(order: ShopifyOrderPayload): { groups: PortraitGroup[]; problems: string[] } {
  const groups = new Map<string, PortraitGroup>();
  const problems: string[] = [];
  for (const line of order.line_items ?? []) {
    const photoUrl = prop(line, "Pet photo");
    if (!photoUrl) {
      problems.push(`Line ${line.id} (${line.title ?? line.sku}) has no pet photo.`);
      continue;
    }
    if (!/^https:\/\/([a-z0-9-]+\.)*(shopify\.com|shopifycdn\.com|shopifycdn\.net)\//i.test(photoUrl)) {
      problems.push(`Line ${line.id} photo is not a Shopify upload URL.`);
      continue;
    }
    const styleId = styleIdFromLabel(prop(line, "Style"));
    if (!styleId) {
      problems.push(`Line ${line.id} has an unknown style.`);
      continue;
    }
    let customPrompt: string | null = null;
    if (styleId === CUSTOM_STYLE_ID) {
      customPrompt = cleanCustomPrompt(prop(line, "Custom style"), [...BANNED_PROMPT_TERMS]);
      if (!customPrompt) {
        problems.push(`Line ${line.id} custom style text is missing or not allowed.`);
        continue;
      }
    }
    const key = `${photoUrl}|${styleId}|${customPrompt ?? ""}`;
    const group =
      groups.get(key) ??
      { key, photoUrl, styleId, customPrompt, petName: prop(line, "Pet name").slice(0, 40), digital: false, physical: [], lineIds: [], unknownSkus: [] };
    group.lineIds.push(String(line.id));
    const sku = (line.sku ?? "").trim();
    if (sku === SHOPIFY_DIGITAL_SKU) group.digital = true;
    else if (SHOPIFY_SKU_TO_PRINT[sku]) group.physical.push({ productId: SHOPIFY_SKU_TO_PRINT[sku]!, quantity: Math.max(1, line.quantity) });
    else group.unknownSkus.push(sku || String(line.id));
    groups.set(key, group);
  }
  return { groups: [...groups.values()], problems };
}

export function shippingFromShopify(order: ShopifyOrderPayload): Shipping | null {
  const a = order.shipping_address;
  const name = a?.name || [a?.first_name, a?.last_name].filter(Boolean).join(" ");
  if (!a || !name || !a.address1 || !a.city || !a.zip || !a.country_code) return null;
  return { name, line1: a.address1, line2: a.address2 ?? "", city: a.city, postalCode: a.zip, countryCode: a.country_code };
}

/** Idempotency key stored in stripeCheckoutSessionId (unique lookup already exists). */
export function shopifyRef(orderId: string | number, groupIndex: number) {
  return `shopify:${orderId}:${groupIndex}`;
}

export function isShopifyOrder(order: Pick<Order, "stripeCheckoutSessionId" | "productMeta">) {
  return Boolean(order.productMeta?.shopify) || (order.stripeCheckoutSessionId ?? "").startsWith("shopify:");
}

export function buildInternalOrder(args: {
  payload: ShopifyOrderPayload;
  group: PortraitGroup;
  groupIndex: number;
  referralCode: string;
  now?: string;
}): Order {
  const { payload, group } = args;
  const now = args.now ?? new Date().toISOString();
  const email = (payload.email || payload.contact_email || "").trim().toLowerCase();
  const tier = group.digital ? DIGITAL_PACK_TIER : DIGITAL_INCLUDED_TIER;
  return {
    id: randomUUID(),
    storeId: "pawtraitry",
    createdAt: now,
    email,
    themeId: STUDIO_THEME_ID,
    subjectType: "pet",
    tierId: tier.id,
    styleIds: [group.styleId],
    cardNames: group.petName,
    status: "paid",
    stripeCheckoutSessionId: shopifyRef(payload.id, args.groupIndex),
    stripePaymentIntentId: null,
    stripeLivemode: !payload.test,
    amountPence: Math.round(Number(payload.total_price ?? 0) * 100),
    priority: false,
    consentAt: now,
    digitalSupplyConsentAt: now,
    utm: { source: "shopify" },
    referralCodeUsed: null,
    ownReferralCode: args.referralCode,
    resultsToken: randomUUID(),
    uploadToken: randomUUID(),
    generationCostGbp: 0,
    deliveredAt: null,
    photosDeleteAfter: null,
    resultsDeleteAfter: null,
    ipHash: "shopify",
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
      personalised: true,
      freePreview: {
        customPrompts: group.customPrompt ? { "0": group.customPrompt } : {},
        path: group.physical.length ? "physical" : "digital",
      },
      checkoutBasket: { physical: group.physical },
      shopify: { orderId: String(payload.id), orderName: payload.name ?? "", lineItemIds: group.lineIds, test: Boolean(payload.test) },
    },
    shipping: shippingFromShopify(payload),
    partnerFulfillment: null,
    falPaidSubmits: 0,
  };
}
