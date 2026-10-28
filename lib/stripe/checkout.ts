import { createHash } from "crypto";
import type Stripe from "stripe";
import { jsonError } from "@/lib/http";
import { checkoutSessionForStore } from "@/lib/stripe/store-checkout";
import type { StoreBrand } from "@/lib/tenant/types";

/** Deterministic Stripe integration id (must be stable for idempotency keys to work). */
export function integrationIdentifier(flow: string, stableKey: string) {
  const digest = createHash("sha256").update(`${flow}:${stableKey}`).digest("hex").slice(0, 20);
  return `pawtraitry_${flow}_${digest}`;
}

export function checkoutSessionPaymentMethodParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "excluded_payment_method_types"
> {
  return { excluded_payment_method_types: ["klarna"] };
}

export async function openCheckoutSessionUrl(
  stripe: Stripe,
  existingSessionId: string | null | undefined,
): Promise<string | null> {
  if (!existingSessionId || existingSessionId.startsWith("demo_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(existingSessionId);
    if (session.status !== "open" || !session.url) return null;
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) return null;
    return session.url;
  } catch {
    return null;
  }
}

export function stripeCheckoutErrorResponse(error: unknown): Response {
  if (error && typeof error === "object" && "type" in error) {
    const stripeError = error as { type?: string; message?: string; statusCode?: number };
    const message =
      stripeError.type === "StripeIdempotencyError"
        ? "Checkout is already in progress. Please wait a moment and try again."
        : stripeError.message || "Payment could not start. Please try again.";
    const status =
      typeof stripeError.statusCode === "number" &&
      stripeError.statusCode >= 400 &&
      stripeError.statusCode < 600
        ? stripeError.statusCode
        : 502;
    return jsonError(message, status);
  }
  return jsonError("Payment could not start. Please try again.", 502);
}

export async function createCheckoutSession(args: {
  stripe: Stripe;
  brand: StoreBrand;
  sessionParams: Stripe.Checkout.SessionCreateParams;
  idempotencyKey: string;
  logoUrl?: string;
}): Promise<{ url: string; sessionId: string }> {
  const session = await args.stripe.checkout.sessions.create(
    checkoutSessionForStore(
      args.brand,
      {
        ...args.sessionParams,
        ...checkoutSessionPaymentMethodParams(),
      },
      { logoUrl: args.logoUrl },
    ),
    { idempotencyKey: args.idempotencyKey },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url, sessionId: session.id };
}
