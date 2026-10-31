import { submitGoDropshipOrders } from "@/lib/shop/admin-order-actions";
import { getStore } from "@/lib/store";

export async function autoSubmitGoDropshipBatch(storeId: string) {
  const store = getStore();
  const orders = (await store.listShopOrders(storeId, "paid")).filter((o) =>
    o.lines.some((line) => line.supplier === "go_dropship"),
  );
  if (!orders.length) return { submitted: 0, batchId: null as string | null };
  return submitGoDropshipOrders(orders);
}

import { isStoreLive } from "@/lib/go-live/live-stores";

export async function autoSubmitAllCatalogueStores() {
  let total = 0;
  for (const storeId of ["fixmonger", "jinglefold"]) {
    if (!isStoreLive(storeId)) continue;
    const result = await autoSubmitGoDropshipBatch(storeId);
    total += result.submitted;
  }
  return total;
}
