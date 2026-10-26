import { isAdmin } from "@/lib/adminAuth";
import { formatGbp } from "@/config/pricing";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const day = londonDay();
  const orders = await store.listOrders();
  const payments = orders.flatMap((order) => order.payments.map((payment) => ({ ...payment, status: order.status })));
  const todayPayments = payments.filter((payment) => londonDay(new Date(payment.createdAt)) === day && payment.status !== "refunded");
  const paidToday = orders.filter((order) => order.payments.some((payment) => londonDay(new Date(payment.createdAt)) === day) && order.status !== "pending_payment");
  return Response.json({
    todayRevenuePence: todayPayments.reduce((sum, payment) => sum + payment.amountPence, 0),
    todayRevenue: formatGbp(todayPayments.reduce((sum, payment) => sum + payment.amountPence, 0)),
    todayOrders: paidToday.length,
    todaySpendGbp: await store.todaySpend(),
    createStarts: await store.countEvents("create_start"),
    createStartsToday: await store.countEvents("create_start", day),
    checkouts: await store.countEvents("checkout"),
    paid: await store.countEvents("paid"),
    paidToday: await store.countEvents("paid", day),
    queueHalted: (await store.getSettings()).queueHalted,
  });
}
