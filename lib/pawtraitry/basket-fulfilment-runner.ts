import type { Order } from "@/lib/domain";
import { alertAdmin } from "@/lib/email";
import { getStore } from "@/lib/store";
import { pawtraitryBasketHasPhysical } from "@/lib/pawtraitry/create-basket";
import { BASKET_FULFILMENT_STALE_MS, basketFulfilmentNeedsWork } from "@/lib/pawtraitry/basket-fulfilment-lock";
import { fulfillPawtraitryCheckoutBasket } from "@/lib/pawtraitry/basket-fulfillment";

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

async function refundStuckPaidPrintsWithoutProdigi(order: Order) {
  const bf = order.productMeta?.basketFulfilment;
  if (bf?.status !== "running" || !bf.claimedAt) return 0;
  if (Date.now() - Date.parse(bf.claimedAt) < BASKET_FULFILMENT_STALE_MS) return 0;

  const store = getStore();
  const prints = await store.listPrints(order.id);
  const { getPrint } = await import("@/config/prints");
  const { safeRefundPortraitLineItem } = await import("@/lib/pawtraitry/partial-refund");
  let count = 0;
  for (const print of prints) {
    if (print.status !== "paid" || print.prodigiOrderId) continue;
    const product = getPrint(print.productId);
    await safeRefundPortraitLineItem(
      order,
      product.pricePence,
      "We could not send this print to our partner in time, so we refunded it.",
    );
    await store.updatePrint(print.id, { status: "failed", error: "fulfilment timeout" });
    count += 1;
  }
  return count;
}
