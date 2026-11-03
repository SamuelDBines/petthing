import { randomUUID } from "crypto";
import type Stripe from "stripe";
import type { ShopOrder } from "@/lib/catalogue/types";
import { sendShopOrderConfirmationEmail, sendShopOrderDispatchedEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";
import { paymentIntentId } from "@/lib/stripe";

function shippingFrom(session: Stripe.Checkout.Session) {
  const details = session.collected_information?.shipping_details;
  const address = details?.address;
  if (!details?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) return null;
  return {
    name: details.name,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    postalCode: address.postal_code,
    countryCode: address.country,
  };
}

export async function markShopOrderPaid(shopOrderId: string, session: Stripe.Checkout.Session) {
  const store = getStore();
  const order = await store.getShopOrder(shopOrderId);
  if (!order || order.status !== "pending_payment") return;
  const shipping = shippingFrom(session);
  await store.updateShopOrder(order.id, {
    status: "paid",
    shipping,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session),
    stripeLivemode: Boolean(session.livemode),
    paidAt: new Date().toISOString(),
  });
  await store.addEvent({
    id: randomUUID(),
    storeId: order.storeId,
    type: "paid",
    orderId: null,
    createdAt: new Date().toISOString(),
  });
  const fresh = await store.getShopOrder(order.id);
  if (fresh) await sendShopOrderConfirmationEmail(fresh);
}

export async function notifyShopOrderDispatched(order: ShopOrder) {
  await sendShopOrderDispatchedEmail(order);
}

export async function listPaidGoDropshipOrders(storeId: string): Promise<ShopOrder[]> {
  const store = getStore();
  return (await store.listShopOrders(storeId, "paid")).filter((o) =>
    o.lines.some((line) => line.supplier === "go_dropship"),
  );
}
