import { metaCapiToken, metaPixelId, metaTestEventCode } from "@/lib/meta/config";
import { hashMetaEmail, hashMetaPhone } from "@/lib/meta/hash";
import { metaCapiAllowed } from "@/lib/meta/staging";
import { classifyTraffic } from "@/lib/analytics/traffic";

export type MetaCapiUserData = {
  email?: string | null;
  phone?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaCapiCustomData = {
  value?: number;
  currency?: string;
  contentIds?: string[];
};

export type MetaCapiEventInput = {
  storeId: string;
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData?: MetaCapiUserData;
  customData?: MetaCapiCustomData;
  /** Must be true when user accepted marketing cookies (PECR). */
  marketingConsent: boolean;
};

type FetchFn = typeof fetch;
let fetchImpl: FetchFn = fetch;

export function __setMetaCapiFetchForTests(fn: FetchFn | null) {
  fetchImpl = fn ?? fetch;
}

export async function sendMetaCapiEvent(input: MetaCapiEventInput, env: NodeJS.ProcessEnv = process.env) {
  if (!input.marketingConsent) return { sent: false, reason: "no_consent" as const };
  if (!metaCapiAllowed(input.storeId, env)) return { sent: false, reason: "staging" as const };

  const pixelId = metaPixelId(input.storeId, env);
  const token = metaCapiToken(input.storeId, env);
  if (!pixelId || !token) return { sent: false, reason: "not_configured" as const };

  const ua = input.userData?.clientUserAgent ?? "";
  const ip = input.userData?.clientIpAddress ?? "";
  const traffic = classifyTraffic({ userAgent: ua, ip });
  if (traffic.excluded) return { sent: false, reason: "excluded_traffic" as const };

  const user_data: Record<string, unknown> = {};
  const em = input.userData?.email ? hashMetaEmail(input.userData.email) : null;
  if (em) user_data.em = [em];
  const ph = input.userData?.phone ? hashMetaPhone(input.userData.phone) : null;
  if (ph) user_data.ph = [ph];
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;
  if (input.userData?.fbp) user_data.fbp = input.userData.fbp;
  if (input.userData?.fbc) user_data.fbc = input.userData.fbc;

  const custom_data: Record<string, unknown> = {};
  if (input.customData?.value != null) custom_data.value = input.customData.value;
  if (input.customData?.currency) custom_data.currency = input.customData.currency;
  if (input.customData?.contentIds?.length) custom_data.content_ids = input.customData.contentIds;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data,
        ...(Object.keys(custom_data).length ? { custom_data } : {}),
      },
    ],
  };
  const testCode = metaTestEventCode(input.storeId, env);
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Meta CAPI failed (${res.status}): ${detail.slice(0, 400)}`);
  }
  return { sent: true as const };
}
