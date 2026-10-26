import { z } from "zod";
import { jsonError, parseBody } from "@/lib/http";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, hashIp } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";

const schema = z.object({
  sessionId: z.string().uuid().optional(),
  visitorId: z.string().max(128).optional(),
  consent: z.enum(["aggregate", "analytics"]),
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  deviceType: z.string().max(32).optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  durationMs: z.number().min(0).max(86_400_000).optional(),
  rageClick: z.boolean().optional(),
  jsError: z.string().max(500).optional(),
  slowLoadMs: z.number().min(0).max(120_000).optional(),
  leave: z.boolean().optional(),
  event: z
    .object({
      type: z.string().min(1).max(64),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

function countryFromRequest(request: Request) {
  return (
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("cloudfront-viewer-country") ||
    null
  );
}

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  if (!store.collectAnalytics) return Response.json({ ok: true });
  const storeId = await requestStoreId();
  const limits = rateLimits();
  const limit = await store.hitRateLimit(`analytics:${hashIp(clientIp(request))}`, limits.analyticsPerMinute, 60 * 1000);
  if (!limit.ok) return Response.json({ ok: true });
  const result = await store.collectAnalytics(storeId, parsed.data, countryFromRequest(request));
  return Response.json({ ok: true, ...result });
}
