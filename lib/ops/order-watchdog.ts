import type { ShopOrder } from "@/lib/catalogue/types";
import type { Order } from "@/lib/domain";
import { alertAdmin } from "@/lib/email";
import { submitJinglefoldPhysicalOrder } from "@/lib/jinglefold/fulfillment";
import { withTransientRetries } from "@/lib/transientErrors";
import { getStore } from "@/lib/store";

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
  if (paidStuck.length) {
    await alertAdmin(
      "Shop orders paid but not submitted",
      `<p>${paidStuck.length} paid Go Dropship orders older than ${PAID_STUCK_HOURS}h. Cron will auto-submit; check failures if this persists.</p>`,
    );
  }
  if (trackingStuck.length) {
    await alertAdmin(
      "Shop orders awaiting tracking",
      `<p>${trackingStuck.length} submitted orders without tracking after ${TRACKING_STUCK_DAYS} days. Add tracking in admin or chase supplier.</p>`,
    );
  }
  return { paidStuck: paidStuck.length, trackingStuck: trackingStuck.length };
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
