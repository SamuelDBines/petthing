import { randomUUID } from "crypto";
import type { ShopOrder } from "@/lib/catalogue/types";
import { alertAdmin } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import { withTransientRetries } from "@/lib/transientErrors";
import { buildGoDropshipCsv } from "@/lib/suppliers/goDropship";
import { sendShopOrderSubmittedToSupplierEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";

export async function autoSubmitGoDropshipBatch(storeId: string) {
  const store = getStore();
  const orders = (await store.listShopOrders(storeId, "paid")).filter((o) =>
    o.lines.some((line) => line.supplier === "go_dropship"),
  );
  if (!orders.length) return { submitted: 0, batchId: null as string | null };

  const csv = buildGoDropshipCsv(orders);
  const batch = {
    id: randomUUID(),
    storeId,
    supplier: "go_dropship" as const,
    orderIds: orders.map((o) => o.id),
    csv,
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
  };

  await withTransientRetries(async () => {
    await store.addSupplierBatch(batch);
    for (const order of orders) {
      await store.updateShopOrder(order.id, {
        supplierBatchId: batch.id,
        status: "submitted_to_supplier",
        fulfillmentError: null,
      });
      const fresh = await store.getShopOrder(order.id);
      if (fresh) await sendShopOrderSubmittedToSupplierEmail(fresh);
    }
  });

  const supplierEmail = process.env.GODROPSHIP_ORDERS_EMAIL?.trim();
  if (supplierEmail) {
    await sendEmail({
      to: supplierEmail,
      subject: `Go Dropship order batch ${batch.id.slice(0, 8)} — ${orders.length} orders`,
      html: `<p>Automated export from catalogue shop (${storeId}).</p><p>Orders: ${orders.length}</p>`,
      attachments: [{ filename: `godropship-${batch.id.slice(0, 8)}.csv`, content: Buffer.from(csv, "utf8") }],
    });
  } else {
    await alertAdmin(
      "Go Dropship batch ready (no GODROPSHIP_ORDERS_EMAIL)",
      `<p>Batch ${batch.id} created for ${storeId} with ${orders.length} orders. Set GODROPSHIP_ORDERS_EMAIL to email CSV automatically.</p>`,
      storeId,
    );
  }

  return { submitted: orders.length, batchId: batch.id };
}

export async function autoSubmitAllCatalogueStores() {
  let total = 0;
  for (const storeId of ["fixmonger", "jinglefold"]) {
    const result = await autoSubmitGoDropshipBatch(storeId);
    total += result.submitted;
  }
  return total;
}
