import type Stripe from "stripe";
import { getStore } from "@/lib/store";

const SHOP_CHECKOUT_TTL_MS = Number(process.env.SHOP_CHECKOUT_TTL_HOURS || "24") * 3_600_000;

export async function expireShopOrderCheckout(shopOrderId: string, reason: string) {
  const store = getStore();
  const order = await store.getShopOrder(shopOrderId);
  if (!order || order.status !== "pending_payment") return false;
  await store.updateShopOrder(order.id, {
    status: "cancelled",
    fulfillmentError: reason,
  });
  return true;
}

export async function expireStaleShopCheckouts() {
  const store = getStore();
  const orders = await store.listShopOrders("all");
  const now = Date.now();
  let expired = 0;
  for (const order of orders) {
    if (order.status !== "pending_payment") continue;
    if (now - Date.parse(order.createdAt) < SHOP_CHECKOUT_TTL_MS) continue;
    await store.updateShopOrder(order.id, {
      status: "cancelled",
      fulfillmentError: "Checkout expired after 24 hours without payment.",
    });
    expired += 1;
  }
  return expired;
}

export async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind === "shop" && session.metadata.shopOrderId) {
    await expireShopOrderCheckout(session.metadata.shopOrderId, "Stripe checkout session expired.");
  }
}
