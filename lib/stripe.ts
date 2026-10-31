import Stripe from "stripe";
import {
  stripeSecretKeyForStore,
  stripeTestSecretKey,
  stripeLiveWebhookSecret,
  stripeTestWebhookSecret,
} from "@/lib/go-live/live-stores";
import { assertStripeSecretKeyAllowed } from "@/lib/stripe/live-key";

const clientsByKey = new Map<string, Stripe>();

export function __resetStripeClientForTests() {
  clientsByKey.clear();
}

function clientForKey(key: string) {
  assertStripeSecretKeyAllowed(key);
  let client = clientsByKey.get(key);
  if (!client) {
    client = new Stripe(key);
    clientsByKey.set(key, client);
  }
  return client;
}

/** Stripe client for a store (live vs test keys from LIVE_STORES + request host). */
export function getStripeForStore(storeId: string, hostOrOpts?: string | import("@/lib/go-live/live-stores").StoreRuntimeOpts) {
  const key = stripeSecretKeyForStore(storeId, hostOrOpts);
  if (!key) return null;
  return clientForKey(key);
}

/** Legacy entry — prefer getStripeForStore(storeId). Uses test key when storeId omitted. */
export function getStripe(storeId?: string) {
  if (storeId) return getStripeForStore(storeId);
  const key = stripeTestSecretKey();
  if (!key) return null;
  return clientForKey(key);
}

export function stripeConfiguredForStore(storeId: string, host?: string) {
  try {
    return Boolean(stripeSecretKeyForStore(storeId, host));
  } catch {
    return false;
  }
}

export function stripeConfigured() {
  const testOk = Boolean(stripeTestSecretKey() && stripeTestWebhookSecret());
  const liveOk = Boolean(
    process.env.STRIPE_LIVE_SECRET_KEY?.trim() && stripeLiveWebhookSecret(),
  );
  return testOk || liveOk;
}

export function paymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}
