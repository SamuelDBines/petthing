import { adminStoreFilter } from "@/lib/admin/storeScope";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { isAdmin } from "@/lib/adminAuth";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const [orders, settings, prints, preorders] = await Promise.all([
    store.listOrders(storeId),
    store.getSettings(storeId === "all" ? DEFAULT_STORE_ID : storeId),
    store.listPrints(),
    store.listPreorders(storeId),
  ]);
  return Response.json({
    settings,
    preorders,
    orders: orders.map((order) => ({
      ...order,
      uploadToken: undefined,
      prints: prints.filter((print) => print.orderId === order.id),
    })),
  });
}
