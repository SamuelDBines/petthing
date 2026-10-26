import type Stripe from "stripe";
import type { StoreBrand } from "@/lib/tenant/types";
import { checkoutSessionOptions } from "@/lib/stripeCheckout";

export function checkoutSessionForStore(
  brand: StoreBrand,
  params: Stripe.Checkout.SessionCreateParams,
  options?: { logoUrl?: string },
): Stripe.Checkout.SessionCreateParams {
  const suffix = (brand.stripeStatementDescriptorSuffix ?? brand.stripeStatementDescriptor).slice(0, 22);
  const logo = options?.logoUrl ?? (brand.logoPath.startsWith("http") ? brand.logoPath : undefined);
  return checkoutSessionOptions({
    ...params,
    payment_intent_data: {
      ...(params.payment_intent_data ?? {}),
      statement_descriptor_suffix: suffix,
    },
    custom_text: {
      ...(params.custom_text ?? {}),
      submit: { message: `Secure checkout · ${brand.legalTradingName}` },
    },
    ...(logo
      ? {
          branding_settings: {
            ...(params.branding_settings ?? {}),
            logo: { url: logo },
          } as Stripe.Checkout.SessionCreateParams["branding_settings"],
        }
      : {}),
  });
}
