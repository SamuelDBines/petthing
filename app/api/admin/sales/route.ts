import { isAdmin } from "@/lib/adminAuth";
import { formatGbp } from "@/config/pricing";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const orders = await store.listOrders();
  const day = londonDay();
  const cap = Number(process.env.MAX_DAILY_GEN_SPEND_GBP || "25");
  const spendToday = await store.todaySpend();

  const byDay = new Map<string, { revenuePence: number; orderIds: Set<string> }>();
  for (const order of orders) {
    if (order.status === "refunded") continue;
    for (const payment of order.payments) {
      if (payment.kind === "seed") continue;
      const d = londonDay(new Date(payment.createdAt));
      const row = byDay.get(d) ?? { revenuePence: 0, orderIds: new Set<string>() };
      row.revenuePence += payment.amountPence;
      row.orderIds.add(order.id);
      byDay.set(d, row);
    }
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([date, row]) => ({
      date,
      revenuePence: row.revenuePence,
      revenue: formatGbp(row.revenuePence),
      orders: row.orderIds.size,
    }));

  const reviewQueue = orders.filter((o) => o.status === "review").length;

  return Response.json({
    days,
    today: {
      date: day,
      revenuePence: days.find((d) => d.date === day)?.revenuePence ?? 0,
      revenue: days.find((d) => d.date === day)?.revenue ?? formatGbp(0),
      orders: days.find((d) => d.date === day)?.orders ?? 0,
      generationSpendGbp: spendToday,
      generationCapGbp: cap,
    },
    reviewQueue,
    contentWorkerUrl: process.env.CONTENT_WORKER_PUBLIC_URL || "http://localhost:8080/admin",
    contentWorkerToken: process.env.CONTENT_WORKER_SECRET || "dev-change-me",
  });
}
