import { after } from "next/server";
import { jsonError } from "@/lib/http";
import { stripeConfigured } from "@/lib/stripe";
import { verifyStripeWebhookPayload } from "@/lib/stripe/webhook-verify";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhook-handler";

export async function POST(request: Request) {
  if (!stripeConfigured()) return jsonError("Stripe webhooks are not configured.", 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing Stripe signature.", 400);
  const body = await request.text();
  const verified = verifyStripeWebhookPayload(body, signature);
  if (!verified) return jsonError("Invalid Stripe signature.", 400);
  const { event, stripe } = verified;

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
