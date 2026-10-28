import Stripe from "stripe";
import { assertStripeSecretKeyAllowed } from "@/lib/stripe/live-key";

let stripeClient: Stripe | null = null;

export function __resetStripeClientForTests() {
  stripeClient = null;
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  assertStripeSecretKeyAllowed(key);
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function paymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}
