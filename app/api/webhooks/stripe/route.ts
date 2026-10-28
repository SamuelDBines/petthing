import { after } from "next/server";
import { jsonError } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhook-handler";

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

  const outcome = await handleStripeWebhookEvent(event, {
    stripe,
    after: (fn) => {
      after(fn);
    },
  });

  if (outcome.status === "retry") {
    const message = outcome.error instanceof Error ? outcome.error.message : "Transient webhook failure";
    return jsonError(message, 500);
  }

  return Response.json({
    received: true,
    ignored: outcome.status === "ignored" ? outcome.reason : undefined,
  });
}
