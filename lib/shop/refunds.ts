import type { ShopOrder } from "@/lib/catalogue/types";
import { sendShopRefundEmail } from "@/lib/shop/emails";
import { getStripeForStore } from "@/lib/stripe";
import { getStore } from "@/lib/store";

export async function refundShopOrder(orderId: string, amountPence?: number) {
  const store = getStore();
  const order = await store.getShopOrder(orderId);
  if (!order) throw new Error("Shop order not found");
  if (order.status === "refunded") throw new Error("Order already refunded");
  if (order.status === "pending_payment") throw new Error("Order was not paid");

  const stripe = getStripeForStore(order.storeId, { stripeLivemode: order.stripeLivemode });
  const intentId = order.stripePaymentIntentId;
  const refundable = order.amountPence - (order.amountRefundedPence ?? 0);
  const refundPence = amountPence ?? refundable;
  if (refundPence <= 0 || refundPence > refundable) {
    throw new Error(`Refund must be between 1p and ${refundable}p`);
  }

  if (stripe && intentId && !intentId.startsWith("demo")) {
    await stripe.refunds.create({
      payment_intent: intentId,
      amount: refundPence,
    });
  }

  const totalRefunded = (order.amountRefundedPence ?? 0) + refundPence;
  const full = totalRefunded >= order.amountPence;
  await store.updateShopOrder(order.id, {
    amountRefundedPence: totalRefunded,
    status: full ? "refunded" : order.status,
  });
  const updated = await store.getShopOrder(order.id);
  if (updated) await sendShopRefundEmail(updated, refundPence);
  return updated;
}
