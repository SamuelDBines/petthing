import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { formatGbp } from "@/config/pricing";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const scoped = storeId === "all" ? DEFAULT_STORE_ID : storeId;
  const day = londonDay();
  const orders = await store.listOrders(storeId);
  const payments = orders.flatMap((order) => order.payments.map((payment) => ({ ...payment, status: order.status })));
  const todayPayments = payments.filter((payment) => londonDay(new Date(payment.createdAt)) === day && payment.status !== "refunded");
  const paidToday = orders.filter((order) => order.payments.some((payment) => londonDay(new Date(payment.createdAt)) === day) && order.status !== "pending_payment");
  return Response.json({
    todayRevenuePence: todayPayments.reduce((sum, payment) => sum + payment.amountPence, 0),
    todayRevenue: formatGbp(todayPayments.reduce((sum, payment) => sum + payment.amountPence, 0)),
    todayOrders: paidToday.length,
    todaySpendGbp: await store.todaySpend(scoped),
    createStarts: await store.countEvents("create_start", undefined, storeId),
    createStartsToday: await store.countEvents("create_start", day, storeId),
    checkouts: await store.countEvents("checkout", undefined, storeId),
    paid: await store.countEvents("paid", undefined, storeId),
    paidToday: await store.countEvents("paid", day, storeId),
    queueHalted: (await store.getSettings(scoped)).queueHalted,
    storeId,
  });
}
