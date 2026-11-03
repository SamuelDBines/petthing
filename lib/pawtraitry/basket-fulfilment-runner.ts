import type { Order } from "@/lib/domain";
import { alertAdmin } from "@/lib/email";
import { getStore } from "@/lib/store";
import { pawtraitryBasketHasPhysical } from "@/lib/pawtraitry/create-basket";
import { BASKET_FULFILMENT_STALE_MS, basketFulfilmentNeedsWork } from "@/lib/pawtraitry/basket-fulfilment-lock";
import { fulfillPawtraitryCheckoutBasket, REFUNDED_PRINT_ERROR_PREFIX } from "@/lib/pawtraitry/basket-fulfillment";

export async function requestPawtraitryBasketFulfilment(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.storeId !== "pawtraitry") return;
  if (!pawtraitryBasketHasPhysical(order.productMeta?.checkoutBasket)) return;
  const bf = order.productMeta?.basketFulfilment;
  if (bf?.status === "done") return;
  if (bf?.status === "running" || bf?.status === "pending") {
    void executePawtraitryBasketFulfilment(orderId);
    return;
  }
  const requestedAt = new Date().toISOString();
  await store.updateOrder(orderId, {
    productMeta: {
      ...order.productMeta,
      basketFulfilment: {
        status: "pending",
        requestedAt,
        lastError: null,
      },
    },
  });
  void executePawtraitryBasketFulfilment(orderId);
}

export async function executePawtraitryBasketFulfilment(orderId: string) {
  const store = getStore();
  const claimed = await store.claimPawtraitryBasketFulfilment(orderId);
  if (!claimed) return;
  try {
    await fulfillPawtraitryCheckoutBasket(claimed);
    const fresh = (await store.getOrder(orderId)) ?? claimed;
    await store.updateOrder(orderId, {
      productMeta: {
        ...fresh.productMeta,
        basketFulfilment: {
          ...fresh.productMeta?.basketFulfilment,
          status: "done",
          completedAt: new Date().toISOString(),
          lastError: null,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Basket fulfilment failed";
    const fresh = (await store.getOrder(orderId)) ?? claimed;
    await store.updateOrder(orderId, {
      productMeta: {
        ...fresh.productMeta,
        basketFulfilment: {
          ...fresh.productMeta?.basketFulfilment,
          status: "failed",
          lastError: message,
        },
      },
    });
    if (fresh.status === "delivered") {
      await alertAdmin(
        "Pawtraitry basket fulfilment failed after delivery",
        `<p>${fresh.email}: ${message}</p>`,
        fresh.storeId,
      );
    }
  }
}

export async function processPawtraitryBasketFulfilmentWatchdog() {
  const store = getStore();
  const orders = await store.listOrders("pawtraitry");
  let triggered = 0;
  let refunds = 0;
  for (const order of orders) {
    if (!basketFulfilmentNeedsWork(order)) continue;
    refunds += await refundStuckPaidPrintsWithoutProdigi(order);
    await executePawtraitryBasketFulfilment(order.id);
    triggered += 1;
  }
  return { triggered, refunds };
}

export async function refundStuckPaidPrintsWithoutProdigi(
  order: Order,
  deps: {
    lookup?: (merchantReference: string, storeId: string) => Promise<{ prodigiOrderId: string } | null>;
    refund?: (order: Order, amountPence: number, reason: string) => Promise<unknown>;
  } = {},
) {
  const bf = order.productMeta?.basketFulfilment;
  if (bf?.status !== "running" || !bf.claimedAt) return 0;
  if (Date.now() - Date.parse(bf.claimedAt) < BASKET_FULFILMENT_STALE_MS) return 0;

  const store = getStore();
  const prints = await store.listPrints(order.id);
  const { getPrint } = await import("@/config/prints");
  const lookup =
    deps.lookup ??
    (async (ref: string, storeId: string) => {
      const { findProdigiOrderByMerchantReference } = await import("@/lib/prodigi");
      return findProdigiOrderByMerchantReference(ref, storeId, { stripeLivemode: order.stripeLivemode });
    });
  const refund =
    deps.refund ??
    (async (o: Order, amount: number, reason: string) => {
      const { safeRefundPortraitLineItem } = await import("@/lib/pawtraitry/partial-refund");
      return safeRefundPortraitLineItem(o, amount, reason);
    });
  let count = 0;
  for (const print of prints) {
    if (print.status !== "paid" || print.prodigiOrderId) continue;
    // The submit may have reached Prodigi before we crashed. Our merchantReference is the print id.
    let existing: { prodigiOrderId: string } | null;
    try {
      existing = await lookup(print.id, order.storeId);
    } catch (error) {
      // Cannot confirm either way: leave the row as paid (it still counts as existing, so no re-order).
      const message = error instanceof Error ? error.message : "Prodigi lookup failed";
      await alertAdmin("Pawtraitry stuck print: Prodigi lookup failed", `<p>${order.email} print ${print.id}: ${message}</p>`, order.storeId);
      continue;
    }
    if (existing) {
      await store.updatePrint(print.id, { status: "submitted", prodigiOrderId: existing.prodigiOrderId, error: null });
      continue;
    }
    const product = getPrint(print.productId);
    await refund(order, product.pricePence, "We could not send this print to our partner in time, so we refunded it.");
    await store.updatePrint(print.id, { status: "failed", error: `${REFUNDED_PRINT_ERROR_PREFIX} fulfilment timeout` });
    count += 1;
  }
  return count;
}
