import { adminStoreFilter } from "@/lib/admin/storeScope";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { isAdmin } from "@/lib/adminAuth";
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
  return Response.json({
    settings,
    preorders,
    shopOrders,
    orders: orders.map((order) => ({
      ...order,
      uploadToken: undefined,
      prints: prints.filter((print) => print.orderId === order.id),
    })),
  });
}
