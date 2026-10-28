import { sendMetaCapiEvent } from "@/lib/meta/capi";
import type { MetaCheckoutAttribution } from "@/lib/meta/types";
import { newMetaEventId } from "@/lib/meta/event-id";

export async function sendMetaInitiateCheckout(args: {
  storeId: string;
  email: string;
  valuePence: number;
  contentIds?: string[];
  ctx?: Partial<MetaCheckoutAttribution> | null;
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string;
}) {
  const marketingConsent = Boolean(args.ctx?.marketingConsent);
  if (!marketingConsent) return;
  const eventId = args.ctx?.initiateCheckoutEventId ?? newMetaEventId("init");
  await sendMetaCapiEvent({
    storeId: args.storeId,
    eventName: "InitiateCheckout",
    eventId,
    marketingConsent: true,
    eventSourceUrl: args.eventSourceUrl,
    userData: {
      email: args.email,
      clientIpAddress: args.clientIp,
      clientUserAgent: args.userAgent,
      fbp: args.ctx?.fbp,
      fbc: args.ctx?.fbc,
    },
    customData: {
      value: args.valuePence / 100,
      currency: "GBP",
      contentIds: args.contentIds,
    },
  });
}

export async function sendMetaLead(args: {
  storeId: string;
  email: string;
  eventId?: string;
  marketingConsent: boolean;
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string;
  fbp?: string | null;
  fbc?: string | null;
}) {
  if (!args.marketingConsent) return;
  await sendMetaCapiEvent({
    storeId: args.storeId,
    eventName: "Lead",
    eventId: args.eventId ?? newMetaEventId("lead"),
    marketingConsent: true,
    eventSourceUrl: args.eventSourceUrl,
    userData: {
      email: args.email,
      clientIpAddress: args.clientIp,
      clientUserAgent: args.userAgent,
      fbp: args.fbp,
      fbc: args.fbc,
    },
  });
}
