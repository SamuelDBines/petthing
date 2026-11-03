import { getStore } from "@/lib/store";

export async function recordPaidAnalyticsEvent(args: {
  storeId: string;
  kind: string;
  orderId?: string;
  visitorSessionId?: string | null;
  amountPence?: number | null;
}) {
  const store = getStore();
  if (!store.recordServerFunnelEvent) return;
  await store.recordServerFunnelEvent({
    storeId: args.storeId,
    eventType: "paid",
    visitorSessionId: args.visitorSessionId,
    path: "/checkout/success",
    metadata: {
      kind: args.kind,
      orderId: args.orderId,
      amountPence: args.amountPence ?? null,
    },
  });
}
