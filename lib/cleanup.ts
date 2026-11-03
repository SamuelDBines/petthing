import { deleteBlob } from "@/lib/blobs";
import { expireStaleShopCheckouts } from "@/lib/shop/checkout-expiry";
import { getStore } from "@/lib/store";

const TWO_DAYS = 48 * 60 * 60 * 1000;

export async function cleanupExpired() {
  const store = getStore();
  const orders = await store.listOrders();
  const now = Date.now();
  let touched = 0;
  for (const order of orders) {
    const assets = await store.listAssets(order.id);
    if (order.status === "pending_payment" && now - Date.parse(order.createdAt) > TWO_DAYS) {
      for (const asset of assets) await deleteBlob(asset.bucket, asset.storagePath);
      await store.deleteAssets(assets.map((asset) => asset.id));
      await store.updateOrder(order.id, {
        status: "failed",
        failureReason: "Checkout was not completed within 48 hours.",
        uploadsDeletedAt: new Date().toISOString(),
      });
      touched += 1;
      continue;
    }
    if (order.photosDeleteAfter && !order.uploadsDeletedAt && Date.parse(order.photosDeleteAfter) < now) {
      const uploads = assets.filter((asset) => asset.kind === "upload");
      for (const asset of uploads) await deleteBlob(asset.bucket, asset.storagePath);
      await store.deleteAssets(uploads.map((asset) => asset.id));
      await store.updateOrder(order.id, { uploadsDeletedAt: new Date().toISOString() });
      touched += 1;
    }
    if (order.resultsDeleteAfter && !order.resultsDeletedAt && Date.parse(order.resultsDeleteAfter) < now) {
      const fresh = await store.listAssets(order.id);
      const results = fresh.filter((asset) => asset.kind !== "upload");
      for (const asset of results) await deleteBlob(asset.bucket, asset.storagePath);
      await store.deleteAssets(results.map((asset) => asset.id));
      await store.updateOrder(order.id, { resultsDeletedAt: new Date().toISOString() });
      touched += 1;
    }
  }
  const shopExpired = await expireStaleShopCheckouts();
  return { touched, shopExpired };
}
