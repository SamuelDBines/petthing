import type Stripe from "stripe";
import type { StoreBrand } from "@/lib/tenant/types";
import { checkoutSessionOptions } from "@/lib/stripeCheckout";
import { paymentIntentDescriptorSuffixForBrand } from "@/lib/stripe/statement-descriptor-suffix";

export function checkoutSessionForStore(
  brand: StoreBrand,
  params: Stripe.Checkout.SessionCreateParams,
  options?: { logoUrl?: string; statementDescriptorSuffix?: boolean },
): Stripe.Checkout.SessionCreateParams {
  const includeSuffix = options?.statementDescriptorSuffix !== false;
  const suffix = includeSuffix ? paymentIntentDescriptorSuffixForBrand(brand) : undefined;
  const logo = options?.logoUrl ?? (brand.logoPath.startsWith("http") ? brand.logoPath : undefined);
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    ...(params.payment_intent_data ?? {}),
  };
  if (suffix) {
    paymentIntentData.statement_descriptor_suffix = suffix;
  } else if (includeSuffix === false && paymentIntentData.statement_descriptor_suffix) {
    delete paymentIntentData.statement_descriptor_suffix;
  }
  return checkoutSessionOptions({
    ...params,
    ...(Object.keys(paymentIntentData).length ? { payment_intent_data: paymentIntentData } : {}),
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
