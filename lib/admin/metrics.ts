import { formatGbp } from "@/config/pricing";
import type { Order } from "@/lib/domain";
import type { ShopOrder } from "@/lib/catalogue/types";
import { londonDay } from "@/lib/runtime";

export type RevenueModeFilter = "all" | "live" | "test";

function portraitPaymentLive(order: Order): boolean | null {
  return order.stripeLivemode ?? null;
}

function shopOrderLive(order: ShopOrder): boolean | null {
  return order.stripeLivemode ?? null;
}

function matchesMode(live: boolean | null, mode: RevenueModeFilter): boolean {
  if (mode === "all") return true;
  if (mode === "live") return live === true;
  return live !== true;
}

export function portraitRevenuePence(orders: Order[], day?: string, mode: RevenueModeFilter = "all") {
  let total = 0;
  for (const order of orders) {
    if (order.status === "refunded") continue;
    if (!matchesMode(portraitPaymentLive(order), mode)) continue;
    for (const payment of order.payments) {
      if (payment.kind === "seed") continue;
      if (day && londonDay(new Date(payment.createdAt)) !== day) continue;
      total += payment.amountPence;
    }
  }
  return total;
}

export function shopRevenuePence(shopOrders: ShopOrder[], day?: string, mode: RevenueModeFilter = "all") {
  let total = 0;
  for (const order of shopOrders) {
    if (order.status === "refunded" || order.status === "pending_payment") continue;
    if (!matchesMode(shopOrderLive(order), mode)) continue;
    if (day && order.paidAt && londonDay(new Date(order.paidAt)) !== day) continue;
    if (day && !order.paidAt) continue;
    total += order.amountPence;
  }
  return total;
}

export function formatRevenue(pence: number) {
  return formatGbp(pence);
}
