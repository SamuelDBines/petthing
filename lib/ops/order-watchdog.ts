import type { ShopOrder } from "@/lib/catalogue/types";
import type { Order } from "@/lib/domain";
import { alertAdmin } from "@/lib/email";
import { submitJinglefoldPhysicalOrder } from "@/lib/jinglefold/fulfillment";
import { withTransientRetries } from "@/lib/transientErrors";
import { getStore } from "@/lib/store";
import { isStoreLive } from "@/lib/go-live/live-stores";
import { listBuiltinStores } from "@/lib/tenant/resolve";

const STUCK_ALERT_DEDUPE_HOURS = 24;

/** Only real orders count: live store, Stripe livemode, not a QA address. */
export function isRealShopOrder(order: ShopOrder, env: NodeJS.ProcessEnv = process.env): boolean {
  if (order.stripeLivemode === false) return false;
  if (order.email.toLowerCase().endsWith("@pawtraitry.test")) return false;
  return isStoreLive(order.storeId, env);
}

function storeLabel(storeId: string): string {
  const cfg = listBuiltinStores().find((c) => c.id === storeId);
  return cfg?.brand.appName ?? storeId;
}

const PAID_STUCK_HOURS = Number(process.env.SHOP_PAID_STUCK_HOURS || "6");
const TRACKING_STUCK_DAYS = Number(process.env.SHOP_TRACKING_STUCK_DAYS || "7");
const SHIPPED_TO_DELIVERED_DAYS = Number(process.env.SHOP_AUTO_DELIVERED_DAYS || "10");

function hoursSince(iso: string) {
  return (Date.now() - Date.parse(iso)) / 3_600_000;
}

function daysSince(iso: string) {
  return (Date.now() - Date.parse(iso)) / 86_400_000;
}

export async function findStuckShopOrders(storeId?: string) {
  const store = getStore();
  const orders = await store.listShopOrders(storeId ?? "all");
  const paidStuck: ShopOrder[] = [];
  const trackingStuck: ShopOrder[] = [];
  for (const order of orders) {
    if (!isRealShopOrder(order)) continue;
    if (order.status === "paid" && order.paidAt && hoursSince(order.paidAt) >= PAID_STUCK_HOURS) {
      if (order.lines.some((l) => l.supplier === "go_dropship")) paidStuck.push(order);
    }
    if (
      order.status === "submitted_to_supplier" &&
      !order.trackingNumber &&
      order.paidAt &&
      daysSince(order.paidAt) >= TRACKING_STUCK_DAYS
    ) {
      trackingStuck.push(order);
    }
  }
  return { paidStuck, trackingStuck };
}

export async function alertStuckShopOrders() {
  const { paidStuck, trackingStuck } = await findStuckShopOrders();
  const store = getStore();
  const now = new Date().toISOString();
  const due = (o: ShopOrder) =>
    !o.stuckAlertSentAt || hoursSince(o.stuckAlertSentAt) >= STUCK_ALERT_DEDUPE_HOURS;
  const groups: { kind: "paid" | "tracking"; orders: ShopOrder[] }[] = [
    { kind: "paid", orders: paidStuck.filter(due) },
    { kind: "tracking", orders: trackingStuck.filter(due) },
  ];
  let alerted = 0;
  for (const { kind, orders } of groups) {
    const byStore = new Map<string, ShopOrder[]>();
    for (const o of orders) byStore.set(o.storeId, [...(byStore.get(o.storeId) ?? []), o]);
    for (const [storeId, list] of byStore) {
      const name = storeLabel(storeId);
      if (kind === "paid") {
        await alertAdmin(
          `${name}: shop orders paid but not submitted`,
          `<p>${list.length} paid Go Dropship orders for ${name} older than ${PAID_STUCK_HOURS}h. Cron will auto-submit; check failures if this persists.</p>`,
        );
      } else {
        await alertAdmin(
          `${name}: shop orders awaiting tracking`,
          `<p>${list.length} submitted ${name} orders without tracking after ${TRACKING_STUCK_DAYS} days. Add tracking in admin or chase supplier.</p>`,
        );
      }
      for (const o of list) {
        await store.updateShopOrder(o.id, { stuckAlertSentAt: now });
        alerted += 1;
      }
    }
  }
  return { paidStuck: paidStuck.length, trackingStuck: trackingStuck.length, alerted };
}

export async function retryFailedPartnerSubmits(storeId = "jinglefold") {
  const store = getStore();
  const orders = await store.listOrders(storeId);
  let retried = 0;
  for (const order of orders) {
    if (!order.productMeta?.personalised) continue;
    const pf = order.partnerFulfillment;
    if (!pf || pf.externalOrderId) continue;
    if (pf.status !== "failed" && !pf.error) continue;
    if (order.status !== "delivered" && order.status !== "review") continue;
    try {
      await withTransientRetries(() => submitJinglefoldPhysicalOrder(order));
      retried += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "retry failed";
      await store.updateOrder(order.id, {
        partnerFulfillment: { ...pf, error: message, lastSyncedAt: new Date().toISOString() },
      });
    }
  }
  return retried;
}

export async function autoAdvanceShippedShopOrders() {
  const store = getStore();
  const orders = await store.listShopOrders("all");
  const { sendShopOrderDeliveredEmail, sendShopReviewRequestEmail } = await import("@/lib/shop/emails");
  let delivered = 0;
  for (const order of orders) {
    if (order.status !== "shipped" || !order.shippedAt) continue;
    if (daysSince(order.shippedAt) < SHIPPED_TO_DELIVERED_DAYS) continue;
    await store.updateShopOrder(order.id, {
      status: "delivered",
      deliveredAt: new Date().toISOString(),
    });
    const fresh = await store.getShopOrder(order.id);
    if (fresh) {
      await sendShopOrderDeliveredEmail(fresh);
      await sendShopReviewRequestEmail(fresh);
    }
    delivered += 1;
  }
  return delivered;
}

export async function findStuckPortraitPartnerOrders(storeId = "jinglefold") {
  const store = getStore();
  const orders = await store.listOrders(storeId);
  const stuck: Order[] = [];
  for (const order of orders) {
    if (!order.productMeta?.personalised) continue;
    if (order.status === "delivered" && !order.partnerFulfillment?.externalOrderId) stuck.push(order);
  }
  return stuck;
}
