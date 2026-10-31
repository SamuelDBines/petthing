import type { ShopOrder } from "@/lib/catalogue/types";
import { sendShopOrderDispatchedEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";

/** Send dispatched email at most once per order (unless admin uses resend_email). */
export async function sendDispatchedEmailOnce(order: ShopOrder) {
  if (order.dispatchedEmailSentAt) return { sent: false as const };
  await sendShopOrderDispatchedEmail(order);
  const now = new Date().toISOString();
  await getStore().updateShopOrder(order.id, { dispatchedEmailSentAt: now });
  return { sent: true as const, at: now };
}
