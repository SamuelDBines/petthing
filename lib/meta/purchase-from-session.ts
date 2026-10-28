import type Stripe from "stripe";
import { getStore } from "@/lib/store";
import { sendMetaCapiEvent } from "@/lib/meta/capi";
import { metaConsentFromStripeMetadata, metaPurchaseEventIdFromSession } from "@/lib/meta/stripe-metadata";
import { paymentIntentId } from "@/lib/stripe";

export async function sendMetaPurchaseFromCheckoutSession(
  session: Stripe.Checkout.Session,
  ctx?: { clientIp?: string | null; userAgent?: string | null },
) {
  const storeId = session.metadata?.storeId;
  if (!storeId) return;
  if (!metaConsentFromStripeMetadata(session.metadata ?? undefined)) return;
  const eventId = metaPurchaseEventIdFromSession(session.metadata ?? undefined);
  if (!eventId) return;

  const value = (session.amount_total ?? 0) / 100;
  const contentIds = await contentIdsForSession(session);
  const email = session.customer_details?.email ?? session.customer_email ?? undefined;

  await sendMetaCapiEvent({
    storeId,
    requestHost: hostFromCheckoutSession(session),
    eventName: "Purchase",
    eventId,
    eventSourceUrl: session.success_url ?? undefined,
    marketingConsent: true,
    userData: {
      email,
      clientIpAddress: ctx?.clientIp,
      clientUserAgent: ctx?.userAgent,
      fbp: session.metadata?.metaFbp,
      fbc: session.metadata?.metaFbc,
    },
    customData: {
      value,
      currency: (session.currency ?? "gbp").toUpperCase(),
      contentIds,
    },
  });
}

function hostFromCheckoutSession(session: Stripe.Checkout.Session) {
  const url = session.success_url;
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

async function contentIdsForSession(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;
  const store = getStore();
  if (kind === "shop" && session.metadata?.shopOrderId && store.getShopOrder) {
    const order = await store.getShopOrder(session.metadata.shopOrderId);
    return order?.lines.map((l) => l.supplierSku) ?? [];
  }
  if (session.metadata?.orderId && store.getOrder) {
    const order = await store.getOrder(session.metadata.orderId);
    if (order) return [order.tierId, ...order.styleIds].filter(Boolean);
  }
  if (session.metadata?.printId) return [session.metadata.printId];
  if (session.metadata?.preorderId) return [session.metadata.preorderId];
  return [];
}

export function metaAttributionFromRequest(request: Request) {
  return {
    clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}
