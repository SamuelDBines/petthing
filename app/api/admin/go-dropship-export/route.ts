import { randomUUID } from "crypto";
import { requireAdminPost } from "@/lib/adminAuth";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { buildGoDropshipCsv } from "@/lib/suppliers/goDropship";
import { listPaidGoDropshipOrders, notifyShopOrderDispatched } from "@/lib/shop/fulfillment";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
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
    const updated = await store.getShopOrder(order.id);
    if (updated) await notifyShopOrderDispatched(updated);
  }
  return Response.json({ batchId: batch.id, csv, orderCount: orders.length });
}

export async function PATCH(request: Request) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { batchId?: string };
  if (!body?.batchId) return jsonError("batchId required");
  const store = getStore();
  await store.updateSupplierBatch(body.batchId, { submittedAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
