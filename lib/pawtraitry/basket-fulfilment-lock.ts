import type { Order } from "@/lib/domain";
import { pawtraitryBasketHasPhysical } from "@/lib/pawtraitry/create-basket";

export const BASKET_FULFILMENT_STALE_MS = 30 * 60 * 1000;

export type BasketFulfilmentMeta = NonNullable<Order["productMeta"]>["basketFulfilment"];

export function basketFulfilmentClaimable(
  order: Pick<Order, "status" | "productMeta">,
  nowMs = Date.now(),
): boolean {
  if (order.status !== "delivered") return false;
  if (!pawtraitryBasketHasPhysical(order.productMeta?.checkoutBasket)) return false;
  const bf = order.productMeta?.basketFulfilment;
  if (!bf || bf.status === "pending" || bf.status === "failed") return true;
  if (bf.status === "done") return false;
  if (bf.status === "running") {
    const claimedAt = bf.claimedAt ? Date.parse(bf.claimedAt) : 0;
    return claimedAt > 0 && nowMs - claimedAt >= BASKET_FULFILMENT_STALE_MS;
  }
  return false;
}

export function basketFulfilmentNeedsWork(order: Order, nowMs = Date.now()) {
  if (order.storeId !== "pawtraitry" || order.status !== "delivered") return false;
  if (!pawtraitryBasketHasPhysical(order.productMeta?.checkoutBasket)) return false;
  const bf = order.productMeta?.basketFulfilment;
  if (!bf || bf.status === "pending" || bf.status === "failed") return true;
  if (bf.status === "done") return false;
  if (bf.status === "running") {
    const claimedAt = bf.claimedAt ? Date.parse(bf.claimedAt) : 0;
    return claimedAt > 0 && nowMs - claimedAt >= BASKET_FULFILMENT_STALE_MS;
  }
  return false;
}
