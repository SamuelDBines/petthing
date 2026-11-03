import type { Order } from "@/lib/domain";
import { getStore } from "@/lib/store";

export function orderNeedsPhotoSafetyReview(order: Order) {
  return Boolean(order.productMeta?.photoSafetyReviewRequired);
}

export async function flagOrderPhotoSafetyReview(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return;
  await store.updateOrder(orderId, {
    productMeta: { ...(order.productMeta ?? {}), photoSafetyReviewRequired: true },
  });
}
