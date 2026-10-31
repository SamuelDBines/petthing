import type Stripe from "stripe";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { getStore } from "@/lib/store";

export const KNOWN_STORE_IDS = new Set(BUILTIN_STORES.map((s) => s.id));

export const OUR_CHECKOUT_KINDS = new Set([
  "portrait",
  "season_pass",
  "extra_styles",
  "print",
  "christmas",
  "shop",
]);

export function isKnownStoreId(storeId: string | undefined | null): storeId is string {
  return Boolean(storeId && KNOWN_STORE_IDS.has(storeId));
}

export function storeIdFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  const id = metadata?.storeId;
  return isKnownStoreId(id) ? id : null;
}

/** True when checkout metadata matches a Pawtraitry-platform session (all stores set storeId). */
export function checkoutSessionMetadataIsOurs(session: Pick<Stripe.Checkout.Session, "metadata">) {
  const storeId = storeIdFromMetadata(session.metadata ?? undefined);
  if (!storeId) return false;
  const kind = session.metadata?.kind;
  if (!kind || !OUR_CHECKOUT_KINDS.has(kind)) return false;
  if (kind === "shop") return Boolean(session.metadata?.shopOrderId);
  if (kind === "print") return Boolean(session.metadata?.printId);
  if (kind === "christmas") return Boolean(session.metadata?.preorderId);
  return Boolean(session.metadata?.orderId);
}

export type PaymentIntentLookup = (paymentIntentId: string) => Promise<boolean>;

export async function defaultPaymentIntentLookup(paymentIntentId: string): Promise<boolean> {
  const store = getStore();
  if ("listOrders" in store && typeof store.listOrders === "function") {
    const orders = await store.listOrders("all");
    for (const order of orders) {
      if (order.stripePaymentIntentId === paymentIntentId) return true;
      if (order.payments?.some((p) => p.paymentIntentId === paymentIntentId)) return true;
    }
  }
  if ("listShopOrders" in store && typeof store.listShopOrders === "function") {
    const shopOrders = await store.listShopOrders("all");
    if (shopOrders.some((o) => o.stripePaymentIntentId === paymentIntentId)) return true;
  }
  if ("listPrints" in store && typeof store.listPrints === "function") {
    const prints = await store.listPrints();
    if (prints.some((p) => p.stripePaymentIntentId === paymentIntentId)) return true;
  }
  if ("listPreorders" in store && typeof store.listPreorders === "function") {
    const preorders = await store.listPreorders("all");
    if (preorders.some((p) => p.stripePaymentIntentId === paymentIntentId)) return true;
  }
  return false;
}

export function paymentIntentIdFromCharge(charge: Stripe.Charge) {
  if (!charge.payment_intent) return null;
  return typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
}

export async function chargeBelongsToUs(
  charge: Stripe.Charge,
  lookup: PaymentIntentLookup,
): Promise<boolean> {
  if (storeIdFromMetadata(charge.metadata)) return true;
  const pi = paymentIntentIdFromCharge(charge);
  if (!pi) return false;
  return lookup(pi);
}
