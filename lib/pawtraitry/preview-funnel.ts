import { DIGITAL_INCLUDED_TIER, DIGITAL_PACK_PENCE, DIGITAL_PACK_TIER } from "@/config/pricing";
import {
  normalizePhysicalBasket,
  physicalBasketSubtotalPence,
  type PawtraitryPhysicalBasketLine,
} from "@/lib/pawtraitry/create-basket";

/** localStorage key for the free preview draft (order id, upload token, email, delivery consent). */
export const PREVIEW_SESSION_KEY = "pawtraitry-preview-session";

export type PreviewDraft = {
  orderId: string;
  uploadToken: string;
  email: string;
  /** Digital delivery consent tick, kept so Back from Stripe does not untick it. */
  supplyConsent?: boolean;
};

export function parsePreviewDraft(raw: string | null): PreviewDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PreviewDraft>;
    if (typeof value.orderId !== "string" || typeof value.uploadToken !== "string") return null;
    return {
      orderId: value.orderId,
      uploadToken: value.uploadToken,
      email: typeof value.email === "string" ? value.email : "",
      supplyConsent: value.supplyConsent === true,
    };
  } catch {
    return null;
  }
}

/** The success page may only drop the draft once Stripe has confirmed payment. */
export function shouldClearPreviewDraft(payload: { trackPurchase: boolean } | null | undefined) {
  return Boolean(payload?.trackPurchase);
}

/** Previews that turned ready and have not been reported yet. */
export function newlyReadyPreviewIds(previews: { jobId: string; status: string }[], seen: ReadonlySet<string>) {
  return previews.filter((p) => p.status === "ready" && !seen.has(p.jobId)).map((p) => p.jobId);
}

export function digitalPackCartEvent() {
  return { value: DIGITAL_PACK_PENCE / 100, currency: "GBP", contentIds: [DIGITAL_PACK_TIER.id] };
}

export function physicalCartEvent(lines: PawtraitryPhysicalBasketLine[]) {
  const physical = normalizePhysicalBasket(lines);
  return {
    value: physicalBasketSubtotalPence(physical) / 100,
    currency: "GBP",
    contentIds: [DIGITAL_INCLUDED_TIER.id, ...physical.map((line) => line.productId)],
  };
}

/** Product ids whose quantity went up between two basket states (an add to cart). */
export function addedProductIds(before: PawtraitryPhysicalBasketLine[], after: PawtraitryPhysicalBasketLine[]) {
  const prev = new Map(before.map((line) => [line.productId, line.quantity]));
  return after.filter((line) => line.quantity > (prev.get(line.productId) ?? 0)).map((line) => line.productId);
}

/**
 * Stripe idempotency key for a free preview portrait checkout. Each basket save (PUT /api/previews)
 * stamps a new attempt time, so re-opening checkout for the same amount after Back gets a new key
 * instead of replaying an old key with different parameters (Stripe answers that with a 400).
 */
export function portraitCheckoutIdempotencyKey(args: { orderId: string; amountPence: number; attemptAt?: string | null }) {
  const base = `portrait-${args.orderId}-${args.amountPence}`;
  return args.attemptAt ? `${base}-${Date.parse(args.attemptAt) || args.attemptAt}` : base;
}
