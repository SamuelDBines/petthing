import { randomUUID } from "crypto";
import { isAdmin } from "@/lib/adminAuth";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { buildGoDropshipCsv } from "@/lib/suppliers/goDropship";
import { listPaidGoDropshipOrders } from "@/lib/shop/fulfillment";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function POST() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const storeId = await adminStoreFilter();
  if (!storeId || storeId === "all") return jsonError("Select a catalogue store first.");
  const orders = await listPaidGoDropshipOrders(storeId);
  if (!orders.length) return jsonError("No paid Go Dropship orders to export.");
  const csv = buildGoDropshipCsv(orders);
  const store = getStore();
  const batch = {
    id: randomUUID(),
    storeId,
    supplier: "go_dropship" as const,
    orderIds: orders.map((o) => o.id),
    csv,
    createdAt: new Date().toISOString(),
    submittedAt: null,
  };
  await store.addSupplierBatch(batch);
  for (const order of orders) {
    await store.updateShopOrder(order.id, { supplierBatchId: batch.id, status: "submitted_to_supplier" });
  }
  return Response.json({ batchId: batch.id, csv, orderCount: orders.length });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const body = (await request.json().catch(() => null)) as { batchId?: string };
  if (!body?.batchId) return jsonError("batchId required");
  const store = getStore();
  await store.updateSupplierBatch(body.batchId, { submittedAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
