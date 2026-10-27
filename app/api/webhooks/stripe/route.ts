import { alertAdmin } from "@/lib/email";
import { fulfillCheckoutSession, noteFailedPayment, noteSeasonCanceled, noteSeasonRenewed } from "@/lib/fulfillment";
import { jsonError } from "@/lib/http";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return jsonError("Stripe webhooks are not configured.", 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing Stripe signature.", 400);
  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return jsonError(message, 400);
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillCheckoutSession(event.data.object);
  }
  if (event.type === "checkout.session.expired") {
    const { handleCheckoutSessionExpired } = await import("@/lib/shop/checkout-expiry");
    await handleCheckoutSessionExpired(event.data.object);
  }
  if (event.type === "checkout.session.async_payment_failed") {
    await noteFailedPayment(event.data.object);
  }
  if (event.type === "invoice.paid" && event.data.object.billing_reason === "subscription_cycle") {
    const subscription = event.data.object.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
    if (subscriptionId) await noteSeasonRenewed(subscriptionId);
  }
  if (event.type === "customer.subscription.deleted") {
    await noteSeasonCanceled(event.data.object.id);
  }
  if (event.type === "charge.dispute.created" || event.type === "charge.refunded" || event.type === "radar.early_fraud_warning.created") {
    await alertAdmin("Stripe needs a look", `<p>${event.type}</p><p>${event.id}</p>`);
  }
  return Response.json({ received: true });
}
