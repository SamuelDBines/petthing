import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { buildDashboard, comparisonRange, rollupForEmptyRange } from "@/lib/analytics/dashboard";
import { emptyRollup, mergeRollups } from "@/lib/analytics/rollup";
import { resolveAnalyticsRange } from "@/lib/analytics/range";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

function ordersInRange(store: ReturnType<typeof getStore>, storeId: string | "all", from: string, to: string) {
  if (!store.listOrders) return Promise.resolve([]);
  return store.listOrders(storeId === "all" ? "all" : storeId).then((orders) =>
    orders.filter((order) => {
      const day = order.createdAt.slice(0, 10);
      return day >= from && day <= to;
    }),
  );
}

function shopOrdersInRange(store: ReturnType<typeof getStore>, storeId: string | "all", from: string, to: string) {
  if (!store.listShopOrders) return Promise.resolve([]);
  return store.listShopOrders(storeId === "all" ? "all" : storeId).then((orders) =>
    orders.filter((order) => {
      const day = order.createdAt.slice(0, 10);
      return day >= from && day <= to;
    }),
  );
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "7d";
  const range = resolveAnalyticsRange(preset, url.searchParams.get("from"), url.searchParams.get("to"));
  const includeExcluded = url.searchParams.get("includeExcluded") === "1";
  const storeFilter = (url.searchParams.get("store") as string | null) || (await adminStoreFilter());
  const store = getStore();
  if (!store.getAnalyticsRollups) {
    return Response.json(rollupForEmptyRange(range.from, range.to, storeFilter === "all" ? "all" : storeFilter, range.preset));
  }

  const compare = comparisonRange(range.from, range.to);
  const [daily, compareDaily, orders, shopOrders, activeNow] = await Promise.all([
    store.getAnalyticsRollups(storeFilter === "all" ? "all" : storeFilter, range.from, range.to, includeExcluded),
    store.getAnalyticsRollups(storeFilter === "all" ? "all" : storeFilter, compare.from, compare.to, includeExcluded),
    ordersInRange(store, storeFilter === "all" ? "all" : storeFilter, range.from, range.to),
    shopOrdersInRange(store, storeFilter === "all" ? "all" : storeFilter, range.from, range.to),
    store.countActiveVisitors?.(storeFilter === "all" ? "all" : storeFilter, includeExcluded) ?? 0,
  ]);

  const comparisonMetrics = compareDaily.length
    ? mergeRollups(compareDaily.map((row) => row.metrics))
    : emptyRollup();

  const dashboard = buildDashboard({
    storeId: storeFilter === "all" ? "all" : storeFilter,
    from: range.from,
    to: range.to,
    preset: range.preset,
    includeExcluded,
    activeNow,
    daily: daily.length ? daily : [{ day: range.from, metrics: emptyRollup() }],
    orders,
    shopOrders,
    comparison: { from: compare.from, to: compare.to, metrics: comparisonMetrics },
  });

  if (storeFilter !== "all") return Response.json(dashboard);
  const byStore: Record<string, ReturnType<typeof buildDashboard>> = {};
  for (const builtin of BUILTIN_STORES) {
    const storeDaily = await store.getAnalyticsRollups(builtin.id, range.from, range.to, includeExcluded);
    byStore[builtin.id] = buildDashboard({
      storeId: builtin.id,
      from: range.from,
      to: range.to,
      preset: range.preset,
      includeExcluded,
      daily: storeDaily.length ? storeDaily : [{ day: range.from, metrics: emptyRollup() }],
    });
  }
  return Response.json({ ...dashboard, byStore });
}
