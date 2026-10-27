import { fetchProdigiOrder } from "@/lib/prodigi";
import { alertAdmin } from "@/lib/email";
import { getStore } from "@/lib/store";

export async function syncOpenProdigiPrints() {
  const store = getStore();
  const prints = await store.listPrints();
  let synced = 0;
  for (const print of prints) {
    if (!print.prodigiOrderId || print.status === "failed") continue;
    if (print.status === "submitted") {
      try {
        const remote = await fetchProdigiOrder(print.prodigiOrderId);
        if (remote.trackingNumber) {
          await store.updatePrint(print.id, { error: null });
          synced += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "sync failed";
        await alertAdmin("Prodigi print sync failed", `<p>Print ${print.id}: ${message}</p>`);
      }
    }
  }
  return synced;
}
