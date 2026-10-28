import type { Order } from "@/lib/domain";
import type { DailyRollupMetrics } from "@/lib/analytics/types";
import { clampRate } from "@/lib/analytics/metrics";

export function attachRevenueToRollups(metrics: DailyRollupMetrics, orders: Order[]) {
  for (const order of orders) {
    if (order.status === "pending_payment" || order.status === "refunded") continue;
    const paid = order.payments.reduce((sum, payment) => sum + payment.amountPence, 0) || order.amountPence;
    const source = campaignSourceFromUtm(order.utm);
    const row = metrics.revenueBySource[source] ?? { orders: 0, revenuePence: 0 };
    row.orders += 1;
    row.revenuePence += paid;
    metrics.revenueBySource[source] = row;
  }
}

export function attachShopRevenueToRollups(metrics: DailyRollupMetrics, orders: import("@/lib/catalogue/types").ShopOrder[]) {
  for (const order of orders) {
    if (order.status === "pending_payment" || order.status === "cancelled" || order.status === "refunded") continue;
    const paid = order.amountPence - (order.amountRefundedPence ?? 0);
    if (paid <= 0) continue;
    const source = campaignSourceFromUtm(order.utm);
    const row = metrics.revenueBySource[source] ?? { orders: 0, revenuePence: 0 };
    row.orders += 1;
    row.revenuePence += paid;
    metrics.revenueBySource[source] = row;
  }
}

function campaignSourceFromUtm(utm?: Record<string, string> | null) {
  if (!utm) return "direct";
  return utm.utm_source || utm.utm_campaign || utm.fbclid || utm.gclid || "direct";
}

export function revenueSummary(metrics: DailyRollupMetrics, sessions: number) {
  const rows = Object.entries(metrics.revenueBySource);
  const orders = rows.reduce((sum, [, row]) => sum + row.orders, 0);
  const revenuePence = rows.reduce((sum, [, row]) => sum + row.revenuePence, 0);
  return {
    orders,
    revenuePence,
    aovPence: orders ? Math.round(revenuePence / orders) : 0,
    conversionRate: clampRate(orders, sessions),
    bySource: rows
      .map(([source, row]) => ({
        source,
        orders: row.orders,
        revenuePence: row.revenuePence,
        aovPence: row.orders ? Math.round(row.revenuePence / row.orders) : 0,
        conversionRate: null as number | null,
      }))
      .sort((a, b) => b.revenuePence - a.revenuePence),
  };
}
