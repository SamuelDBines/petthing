import type Stripe from "stripe";

/** GBP-only Checkout: disable adaptive currency conversion and default to UK presentation. */
export function checkoutSessionOptions(
  params: Stripe.Checkout.SessionCreateParams,
): Stripe.Checkout.SessionCreateParams {
  return {
    ...params,
    locale: params.locale ?? "en-GB",
    adaptive_pricing: { enabled: false },
  };
}
