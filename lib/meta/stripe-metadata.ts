import type { MetaCheckoutAttribution } from "@/lib/meta/types";
import { newMetaEventId } from "@/lib/meta/event-id";

const MAX = 500;

function clip(value: string) {
  return value.length <= MAX ? value : value.slice(0, MAX);
}

/** Stripe Checkout session metadata for Meta dedup + CAPI (short keys). */
export function metaStripeMetadata(ctx: MetaCheckoutAttribution) {
  const out: Record<string, string> = {};
  if (ctx.purchaseEventId) out.metaEventId = clip(ctx.purchaseEventId);
  if (ctx.initiateCheckoutEventId) out.metaInitEventId = clip(ctx.initiateCheckoutEventId);
  if (ctx.marketingConsent) out.metaMarketing = "1";
  else out.metaMarketing = "0";
  if (ctx.fbp) out.metaFbp = clip(ctx.fbp);
  if (ctx.fbc) out.metaFbc = clip(ctx.fbc);
  return out;
}

export function metaConsentFromStripeMetadata(metadata: Record<string, string | undefined> | null | undefined) {
  return metadata?.metaMarketing === "1";
}

export function metaPurchaseEventIdFromSession(metadata: Record<string, string | undefined> | null | undefined) {
  return metadata?.metaEventId?.trim() || null;
}

export function mergeCheckoutStripeMetadata(
  base: Record<string, string>,
  ctx: Partial<MetaCheckoutAttribution> | null | undefined,
) {
  if (!ctx?.purchaseEventId) return base;
  const full: MetaCheckoutAttribution = {
    purchaseEventId: ctx.purchaseEventId,
    initiateCheckoutEventId: ctx.initiateCheckoutEventId ?? newMetaEventId("init"),
    marketingConsent: Boolean(ctx.marketingConsent),
    fbp: ctx.fbp,
    fbc: ctx.fbc,
  };
  return { ...base, ...metaStripeMetadata(full) };
}
