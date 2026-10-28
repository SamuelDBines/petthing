import { APP_NAME } from "@/config/brand";
import { formatGbp } from "@/config/pricing";
import type { Order } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { getStripeForStore, paymentIntentId } from "@/lib/stripe";
import { getStore } from "@/lib/store";

export async function refundPortraitLineItem(order: Order, amountPence: number, customerReason: string) {
  if (amountPence <= 0) return;
  const stripe = getStripeForStore(order.storeId, { stripeLivemode: order.stripeLivemode });
  const intent = order.stripePaymentIntentId ?? order.payments.find((p) => p.paymentIntentId)?.paymentIntentId;
  if (stripe && intent && !intent.startsWith("demo")) {
    try {
      await stripe.refunds.create({ payment_intent: intent, amount: amountPence });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "charge_already_refunded") throw error;
    }
  }
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: `Refund on your ${APP_NAME} order`,
      html: `<p>We could not fulfil part of your order.</p><p>${customerReason}</p><p>We have refunded <strong>${formatGbp(amountPence)}</strong> to your original payment method.</p>`,
      storeId: order.storeId,
    }),
  );
  const store = getStore();
  const fresh = await store.getOrder(order.id);
  if (fresh) {
    await store.updateOrder(order.id, {
      amountPence: Math.max(0, fresh.amountPence - amountPence),
    });
  }
}

/** Resolve payment intent after checkout webhook (portrait session). */
export async function capturePortraitPaymentIntent(orderId: string, session: { payment_intent?: unknown }) {
  const intent = paymentIntentId(session as import("stripe").Stripe.Checkout.Session);
  if (!intent) return;
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.stripePaymentIntentId) return;
  await store.updateOrder(orderId, { stripePaymentIntentId: intent });
}
