import type Stripe from "stripe";
import { getStore } from "@/lib/store";

export function stripeSessionLivemode(session: Pick<Stripe.Checkout.Session, "livemode">) {
  return Boolean(session.livemode);
}

export async function persistCheckoutSessionLivemode(session: Stripe.Checkout.Session) {
  const livemode = stripeSessionLivemode(session);
  const store = getStore();
  const kind = session.metadata?.kind;
  if (kind === "shop" && session.metadata?.shopOrderId && store.updateShopOrder) {
    await store.updateShopOrder(session.metadata.shopOrderId, { stripeLivemode: livemode });
    return;
  }
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  if (kind === "portrait" || kind === "season_pass" || kind === "extra_styles") {
    await store.updateOrder(orderId, { stripeLivemode: livemode });
  }
}
