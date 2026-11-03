import Stripe from "stripe";
import {
  stripeLiveSecretKey,
  stripeLiveWebhookSecret,
  stripeTestSecretKey,
  stripeTestWebhookSecret,
} from "@/lib/go-live/live-stores";

export type VerifiedStripeWebhook = {
  event: Stripe.Event;
  stripe: Stripe;
};

/** Try live and test webhook signing secrets (shared cluster endpoint). */
export function verifyStripeWebhookPayload(body: string, signature: string): VerifiedStripeWebhook | null {
  const attempts: { secret: string; apiKey: string }[] = [];
  const testSecret = stripeTestWebhookSecret();
  const testKey = stripeTestSecretKey();
  if (testSecret && testKey) attempts.push({ secret: testSecret, apiKey: testKey });
  const liveSecret = stripeLiveWebhookSecret();
  const liveKey = stripeLiveSecretKey();
  if (liveSecret && liveKey) attempts.push({ secret: liveSecret, apiKey: liveKey });

  for (const { secret, apiKey } of attempts) {
    try {
      const stripe = new Stripe(apiKey);
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      return { event, stripe };
    } catch {
      /* try next secret */
    }
  }
  return null;
}
