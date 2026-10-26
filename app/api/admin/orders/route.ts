import { isAdmin } from "@/lib/adminAuth";
import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const [orders, settings, prints, preorders] = await Promise.all([
    store.listOrders(),
    store.getSettings(),
    store.listPrints(),
    store.listPreorders(),
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
