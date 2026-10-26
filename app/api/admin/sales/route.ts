import { adminStoreFilter } from "@/lib/admin/storeScope";
import { portraitRevenuePence, shopRevenuePence, formatRevenue } from "@/lib/admin/metrics";
import { isAdmin } from "@/lib/adminAuth";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const [orders, shopOrders] = await Promise.all([
    store.listOrders(storeId),
    store.listShopOrders ? store.listShopOrders(storeId) : Promise.resolve([]),
  ]);
  const day = londonDay();
  const cap = Number(process.env.MAX_DAILY_GEN_SPEND_GBP || "25");
  const spendToday = await store.todaySpend(storeId === "all" ? "all" : storeId);

  const byDay = new Map<string, { revenuePence: number; orderIds: Set<string> }>();
  for (const order of orders) {
    if (order.status === "refunded") continue;
    for (const payment of order.payments) {
      if (payment.kind === "seed") continue;
      const d = londonDay(new Date(payment.createdAt));
      const row = byDay.get(d) ?? { revenuePence: 0, orderIds: new Set<string>() };
      row.revenuePence += payment.amountPence;
      row.orderIds.add(`p-${order.id}`);
      byDay.set(d, row);
    }
  }
  for (const order of shopOrders) {
    if (!order.paidAt || order.status === "refunded") continue;
    const d = londonDay(new Date(order.paidAt));
    const row = byDay.get(d) ?? { revenuePence: 0, orderIds: new Set<string>() };
    row.revenuePence += order.amountPence;
    row.orderIds.add(`s-${order.id}`);
    byDay.set(d, row);
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([date, row]) => ({
      date,
      revenuePence: row.revenuePence,
      revenue: formatRevenue(row.revenuePence),
      orders: row.orderIds.size,
    }));

  const reviewQueue = orders.filter((o) => o.status === "review").length;
  const shopPaidQueue = shopOrders.filter((o) => o.status === "paid").length;

  return Response.json({
    days,
    today: {
      date: day,
      revenuePence: days.find((d) => d.date === day)?.revenuePence ?? 0,
      revenue: days.find((d) => d.date === day)?.revenue ?? formatRevenue(0),
      orders: days.find((d) => d.date === day)?.orders ?? 0,
      generationSpendGbp: spendToday,
      generationCapGbp: cap,
    },
    reviewQueue,
    shopPaidQueue,
    contentWorkerUrl: process.env.CONTENT_WORKER_PUBLIC_URL || "http://localhost:8080/admin",
    contentWorkerToken: process.env.CONTENT_WORKER_SECRET || "dev-change-me",
  });
}
