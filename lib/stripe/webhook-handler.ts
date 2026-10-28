import type Stripe from "stripe";
import { alertAdmin } from "@/lib/email";
import { fulfillCheckoutSession, noteFailedPayment, noteSeasonCanceled, noteSeasonRenewed } from "@/lib/fulfillment";
import { kickOrderGeneration } from "@/lib/generation";
import { storeExpectsStripeLivemode } from "@/lib/go-live/live-stores";
import { storeIdFromMetadata } from "@/lib/stripe/ownership";
import {
  chargeBelongsToUs,
  checkoutSessionMetadataIsOurs,
  defaultPaymentIntentLookup,
  type PaymentIntentLookup,
} from "@/lib/stripe/ownership";
import { isTransientError } from "@/lib/transientErrors";

export type StripeWebhookDeps = {
  stripe?: import("stripe").default | null;
  lookupPaymentIntent?: PaymentIntentLookup;
  fulfillCheckoutSession?: typeof fulfillCheckoutSession;
  alertAdmin?: typeof alertAdmin;
  after?: (fn: () => void) => void;
};

export type StripeWebhookOutcome =
  | { status: "ok" }
  | { status: "ignored"; reason: string }
  | { status: "retry"; error: unknown };

const CHECKOUT_SESSION_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
]);

const CHARGE_ALERT_TYPES = new Set([
  "charge.dispute.created",
  "charge.refunded",
  "radar.early_fraud_warning.created",
]);

function storeIdFromEvent(event: Stripe.Event): string | null {
  if (CHECKOUT_SESSION_TYPES.has(event.type)) {
    return storeIdFromMetadata((event.data.object as Stripe.Checkout.Session).metadata ?? undefined);
  }
  if (CHARGE_ALERT_TYPES.has(event.type)) {
    const charge = event.data.object as Stripe.Charge;
    return storeIdFromMetadata(charge.metadata ?? undefined);
  }
  return null;
}

/** Process only when Stripe event livemode matches the store's LIVE_STORES mode. */
function livemodeMatchesStore(event: Stripe.Event) {
  const storeId = storeIdFromEvent(event);
  if (!storeId) return true;
  return event.livemode === storeExpectsStripeLivemode(storeId);
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
  deps: StripeWebhookDeps = {},
): Promise<StripeWebhookOutcome> {
  const lookup = deps.lookupPaymentIntent ?? defaultPaymentIntentLookup;
  const fulfill = deps.fulfillCheckoutSession ?? fulfillCheckoutSession;
  const notify = deps.alertAdmin ?? alertAdmin;
  const scheduleAfter = deps.after ?? ((fn: () => void) => fn());

  if (!livemodeMatchesStore(event)) {
    return { status: "ignored", reason: "livemode_mismatch" };
  }

  try {
    if (CHECKOUT_SESSION_TYPES.has(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!checkoutSessionMetadataIsOurs(session)) {
        return { status: "ignored", reason: "foreign_checkout_session" };
      }
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        await fulfill(session);
        try {
          const { sendMetaPurchaseFromCheckoutSession } = await import("@/lib/meta/purchase-from-session");
          await sendMetaPurchaseFromCheckoutSession(session);
        } catch (error) {
          console.error("[meta] Purchase CAPI failed", error);
        }
        const kind = session.metadata?.kind;
        const orderId = session.metadata?.orderId;
        if ((kind === "portrait" || kind === "season_pass" || kind === "extra_styles") && orderId) {
          scheduleAfter(() => {
            void kickOrderGeneration(orderId).catch((error) => {
              console.error(`[stripe] generation kick failed for ${orderId}`, error);
            });
          });
        }
      } else if (event.type === "checkout.session.expired") {
        const { handleCheckoutSessionExpired } = await import("@/lib/shop/checkout-expiry");
        await handleCheckoutSessionExpired(session);
      } else if (event.type === "checkout.session.async_payment_failed") {
        await noteFailedPayment(session);
      }
      return { status: "ok" };
    }

    if (event.type === "invoice.paid" && (event.data.object as Stripe.Invoice).billing_reason === "subscription_cycle") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
      if (subscriptionId) await noteSeasonRenewed(subscriptionId);
      return { status: "ok" };
    }

    if (event.type === "customer.subscription.deleted") {
      await noteSeasonCanceled((event.data.object as Stripe.Subscription).id);
      return { status: "ok" };
    }

    if (CHARGE_ALERT_TYPES.has(event.type)) {
      const charge = await chargeFromEvent(event, deps.stripe ?? null);
      if (!charge) return { status: "ignored", reason: "no_charge" };
      const ours = await chargeBelongsToUs(charge, lookup);
      if (!ours) return { status: "ignored", reason: "foreign_charge" };
      await notify(
        "Stripe needs a look",
        `<p>${event.type}</p><p>${event.id}</p>`,
        charge.metadata?.storeId,
      );
      return { status: "ok" };
    }

    return { status: "ignored", reason: "unhandled_type" };
  } catch (error) {
    const ours = await eventLooksLikeOurs(event, lookup, deps.stripe ?? null);
    console.error(`[stripe] webhook ${event.type} (${event.id}) failed`, error);
    if (ours && isTransientError(error)) {
      return { status: "retry", error };
    }
    if (ours) {
      await notify(
        "Stripe webhook handler error",
        `<p>${event.type}</p><p>${event.id}</p><pre>${error instanceof Error ? error.message : String(error)}</pre>`,
      ).catch((err) => console.error("[stripe] admin alert failed", err));
    }
    return { status: "ok" };
  }
}

async function eventLooksLikeOurs(
  event: Stripe.Event,
  lookup: PaymentIntentLookup,
  stripe: import("stripe").default | null,
) {
  if (CHECKOUT_SESSION_TYPES.has(event.type)) {
    return checkoutSessionMetadataIsOurs(event.data.object as Stripe.Checkout.Session);
  }
  if (CHARGE_ALERT_TYPES.has(event.type)) {
    const charge = await chargeFromEvent(event, stripe);
    if (!charge) return false;
    return chargeBelongsToUs(charge, lookup);
  }
  return false;
}

async function chargeFromEvent(
  event: Stripe.Event,
  stripe: import("stripe").default | null,
): Promise<Stripe.Charge | null> {
  if (event.type === "radar.early_fraud_warning.created") {
    const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
    const chargeRef = warning.charge;
    if (!chargeRef) return null;
    if (typeof chargeRef !== "string") return chargeRef as Stripe.Charge;
    if (stripe) {
      try {
        return await stripe.charges.retrieve(chargeRef);
      } catch (error) {
        console.error(`[stripe] failed to retrieve charge ${chargeRef} for EFW`, error);
        return null;
      }
    }
    return { id: chargeRef, metadata: {}, payment_intent: null } as Stripe.Charge;
  }
  if (event.type === "charge.dispute.created" || event.type === "charge.refunded") {
    return event.data.object as Stripe.Charge;
  }
  return null;
}
