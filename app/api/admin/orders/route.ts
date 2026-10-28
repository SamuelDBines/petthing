import { adminStoreFilter } from "@/lib/admin/storeScope";
import { getTier } from "@/config/pricing";
import { portraitGenerationProgress } from "@/lib/generation/progress";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { isAdmin } from "@/lib/adminAuth";
import { loadStoreConfig } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const [orders, settings, prints, preorders, shopOrders] = await Promise.all([
    store.listOrders(storeId),
    store.getSettings(storeId === "all" ? DEFAULT_STORE_ID : storeId),
    store.listPrints(),
    store.listPreorders(storeId),
    store.listShopOrders ? store.listShopOrders(storeId) : Promise.resolve([]),
  ]);
  const enriched = await Promise.all(
    orders.map(async (order) => {
      const config = await loadStoreConfig(order.storeId);
      const tier = getTier(order.tierId, config.catalog.tiers);
      const [jobs, assets] = await Promise.all([store.listJobs(order.id), store.listAssets(order.id)]);
      const progress = portraitGenerationProgress(tier, jobs, assets);
      return {
        ...order,
        uploadToken: undefined,
        prints: prints.filter((print) => print.orderId === order.id),
        portraitProgress: {
          generated: progress.generated,
          expected: progress.expected,
          complete: progress.complete,
        },
      };
    }),
  );
  return Response.json({
    settings,
    preorders,
    shopOrders,
    orders: enriched,
  });
}
