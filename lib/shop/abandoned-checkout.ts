import { sendShopAbandonedCheckoutEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";

const MIN_AGE_HOURS = Number(process.env.ABANDONED_CHECKOUT_MIN_HOURS || "2");
const MAX_AGE_HOURS = Number(process.env.ABANDONED_CHECKOUT_MAX_HOURS || "48");

export async function sendAbandonedCheckoutReminders() {
  const store = getStore();
  const orders = await store.listShopOrders("all");
  let sent = 0;
  for (const order of orders) {
    if (order.status !== "pending_payment") continue;
    if (!order.marketingConsent) continue;
    if (order.abandonedReminderSentAt) continue;
    const ageH = (Date.now() - Date.parse(order.createdAt)) / 3_600_000;
    if (ageH < MIN_AGE_HOURS || ageH > MAX_AGE_HOURS) continue;
    await sendShopAbandonedCheckoutEmail(order);
    await store.updateShopOrder(order.id, {
      abandonedReminderSentAt: new Date().toISOString(),
    });
    sent += 1;
  }
  return sent;
}
