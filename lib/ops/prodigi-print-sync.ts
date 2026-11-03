import { fetchProdigiOrder, prodigiUnavailableMessage } from "@/lib/prodigi";
import { alertAdmin } from "@/lib/email";
import { getStore } from "@/lib/store";

export async function syncOpenProdigiPrints() {
  const store = getStore();
  const prints = await store.listPrints();
  let synced = 0;
  for (const print of prints) {
    if (!print.prodigiOrderId || print.status === "failed") continue;
    if (print.status === "submitted") {
      const order = await store.getOrder(print.orderId);
      const storeId = order?.storeId ?? "pawtraitry";
      const prodigiOpts = { stripeLivemode: order?.stripeLivemode ?? null };
      const skip = prodigiUnavailableMessage(storeId, prodigiOpts);
      if (skip) {
        await store.updatePrint(print.id, { error: skip });
        continue;
      }
      try {
        const remote = await fetchProdigiOrder(print.prodigiOrderId, storeId, prodigiOpts);
        if (remote.trackingNumber) {
          await store.updatePrint(print.id, { error: null });
          synced += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "sync failed";
        if (message.includes("sandbox API key missing")) {
          await store.updatePrint(print.id, { error: message });
          continue;
        }
        await alertAdmin("Prodigi print sync failed", `<p>Print ${print.id}: ${message}</p>`, storeId);
      }
    }
  }
  return synced;
}
