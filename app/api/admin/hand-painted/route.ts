import { isAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { getStore } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const storeId = await adminStoreFilter();
  const rows = await store.listHandPaintedOrders(storeId);
  return Response.json({ orders: rows });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const body = (await request.json().catch(() => null)) as {
    orderId?: string;
    status?: string;
    proofAssetUrl?: string;
    trackingNumber?: string;
  };
  if (!body?.orderId) return jsonError("orderId required");
  const store = getStore();
  const row = await store.getHandPaintedOrder(body.orderId);
  if (!row) return jsonError("Not found", 404);
  const next = {
    ...row,
    status: (body.status as typeof row.status) ?? row.status,
    proofAssetUrl: body.proofAssetUrl ?? row.proofAssetUrl,
    trackingNumber: body.trackingNumber ?? row.trackingNumber,
    updatedAt: new Date().toISOString(),
  };
  await store.upsertHandPaintedOrder(next);
  return Response.json({ order: next });
}
