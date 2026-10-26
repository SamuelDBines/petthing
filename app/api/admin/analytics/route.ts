import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { buildDashboard, rollupForEmptyRange } from "@/lib/analytics/dashboard";
import { jsonError } from "@/lib/http";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || londonDay();
  const to = url.searchParams.get("to") || londonDay();
  const storeFilter = (url.searchParams.get("store") as string | null) || (await adminStoreFilter());
  const store = getStore();
  if (!store.getAnalyticsRollups) {
    return Response.json(rollupForEmptyRange(from, to, storeFilter === "all" ? "all" : storeFilter));
  }
  const daily = await store.getAnalyticsRollups(storeFilter === "all" ? "all" : storeFilter, from, to);
  const dashboard = buildDashboard({
    storeId: storeFilter === "all" ? "all" : storeFilter,
    from,
    to,
    daily: daily.length ? daily : [{ day: from, metrics: (await import("@/lib/analytics/rollup")).emptyRollup() }],
  });
  return Response.json(dashboard);
}
