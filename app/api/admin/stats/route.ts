import { adminStoreFilter } from "@/lib/admin/storeScope";
import { portraitRevenuePence, shopRevenuePence, formatRevenue } from "@/lib/admin/metrics";
import { isAdmin } from "@/lib/adminAuth";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

const STORE_IDS = BUILTIN_STORES.map((s) => s.id);

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const day = londonDay();
  const [orders, shopOrders] = await Promise.all([
    store.listOrders(storeId),
    store.listShopOrders ? store.listShopOrders(storeId) : Promise.resolve([]),
  ]);

  const portraitToday = portraitRevenuePence(orders, day);
  const shopToday = shopRevenuePence(shopOrders, day);
  const todayRevenuePence = portraitToday + shopToday;

  const paidTodayPortrait = orders.filter(
    (order) =>
      order.status !== "pending_payment" &&
      order.status !== "refunded" &&
      order.payments.some((p) => londonDay(new Date(p.createdAt)) === day),
  ).length;
  const paidTodayShop = shopOrders.filter(
    (o) => o.paidAt && londonDay(new Date(o.paidAt)) === day && o.status !== "refunded",
  ).length;

  const reviewCount = orders.filter((o) => o.status === "review").length;
  const shopPaidQueue = shopOrders.filter((o) => o.status === "paid").length;
  const handPainted =
    store.listHandPaintedOrders
      ? (await store.listHandPaintedOrders(storeId)).filter((h) => h.status !== "delivered").length
      : 0;
  const generating = orders.filter((o) => o.status === "generating").length;

  const scoped = storeId === "all" ? "pawtraitry" : storeId;
  const todaySpendGbp = await store.todaySpend(storeId === "all" ? "all" : scoped);

  const breakdown =
    storeId === "all"
      ? await Promise.all(
          STORE_IDS.map(async (id) => {
            const [o, s] = await Promise.all([
              store.listOrders(id),
              store.listShopOrders ? store.listShopOrders(id) : Promise.resolve([]),
            ]);
            return {
              storeId: id,
              todayRevenue: formatRevenue(portraitRevenuePence(o, day) + shopRevenuePence(s, day)),
              reviewQueue: o.filter((x) => x.status === "review").length,
              shopPaidQueue: s.filter((x) => x.status === "paid").length,
              generating: o.filter((x) => x.status === "generating").length,
            };
          }),
        )
      : undefined;

  return Response.json({
    todayRevenuePence,
    todayRevenue: formatRevenue(todayRevenuePence),
    todayOrders: paidTodayPortrait + paidTodayShop,
    todaySpendGbp,
    createStarts: await store.countEvents("create_start", undefined, storeId),
    createStartsToday: await store.countEvents("create_start", day, storeId),
    checkouts: await store.countEvents("checkout", undefined, storeId),
    paid: await store.countEvents("paid", undefined, storeId),
    paidToday: await store.countEvents("paid", day, storeId),
    queueHalted: (await store.getSettings(scoped)).queueHalted,
    storeId,
    fulfilment: {
      portraitReview: reviewCount,
      shopPaidAwaitingExport: shopPaidQueue,
      handPaintedOpen: handPainted,
      generating,
    },
    storeBreakdown: breakdown,
  });
}
