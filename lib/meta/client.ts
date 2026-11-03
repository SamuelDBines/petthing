"use client";

import type { MetaStandardEvent } from "@/lib/meta/types";

export const MARKETING_CONSENT_KEY = "ps_marketing_consent";
export const ANALYTICS_CONSENT_KEY = "ps_analytics_consent";

export function marketingConsentGranted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MARKETING_CONSENT_KEY) === "yes";
}

export function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function readMetaAttributionCookies() {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
  };
}

type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
};

export function trackMetaEvent(
  event: MetaStandardEvent,
  data?: { value?: number; currency?: string; contentIds?: string[] },
  eventId?: string,
) {
  if (typeof window === "undefined" || !marketingConsentGranted()) return eventId ?? null;
  const id = eventId ?? crypto.randomUUID();
  const payload: Record<string, unknown> = { currency: data?.currency ?? "GBP" };
  if (data?.value != null) payload.value = data.value;
  if (data?.contentIds?.length) payload.content_ids = data.contentIds;
  (window as PixelWindow).fbq?.("track", event, payload, { eventID: id });
  return id;
}

export function trackMetaPageView() {
  if (typeof window === "undefined" || !marketingConsentGranted()) return;
  (window as PixelWindow).fbq?.("track", "PageView");
}

/** Build attribution payload for checkout API calls. */
export function metaCheckoutAttribution(initiateCheckoutEventId?: string) {
  const purchaseEventId = crypto.randomUUID();
  const initId = initiateCheckoutEventId ?? crypto.randomUUID();
  const { fbp, fbc } = readMetaAttributionCookies();
  return {
    purchaseEventId,
    initiateCheckoutEventId: initId,
    marketingConsent: marketingConsentGranted(),
    fbp: fbp ?? undefined,
    fbc: fbc ?? undefined,
  };
}

const META_CHECKOUT_STORAGE_KEY = "ps_meta_checkout_pending";

export function stashMetaCheckoutAttribution(ctx: ReturnType<typeof metaCheckoutAttribution>, contentIds?: string[]) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    META_CHECKOUT_STORAGE_KEY,
    JSON.stringify({
      purchaseEventId: ctx.purchaseEventId,
      contentIds: contentIds ?? [],
    }),
  );
}

export function readStashedMetaPurchase(sessionId: string | null) {
  if (typeof sessionStorage === "undefined" || !sessionId) return null;
  const raw = sessionStorage.getItem(META_CHECKOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { purchaseEventId?: string; contentIds?: string[] };
    if (!parsed.purchaseEventId) return null;
    sessionStorage.setItem(`ps_purchase_meta_${sessionId}`, raw);
    sessionStorage.removeItem(META_CHECKOUT_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function readMetaPurchaseForSession(sessionId: string) {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`ps_purchase_meta_${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { purchaseEventId?: string; contentIds?: string[] };
  } catch {
    return null;
  }
}
