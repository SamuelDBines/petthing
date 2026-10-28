import { z } from "zod";
import { isAdmin } from "@/lib/adminAuth";
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
  userAgent: z.string().max(500).optional(),
  clickIds: z
    .object({
      gclid: z.string().max(200).optional(),
      fbclid: z.string().max(200).optional(),
      ttclid: z.string().max(200).optional(),
    })
    .optional(),
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

function excludeCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return /(?:^|;\s*)ps_analytics_exclude=1(?:;|$)/.test(cookie);
}

function normalizeAnalyticsPath(path: string) {
  if (path.startsWith("/admin")) return "/admin";
  if (/^\/results\/[^/]+/.test(path)) return "/results/:token";
  if (/^\/share\/[^/]+/.test(path)) return "/share/:token";
  return path;
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
  const payload = { ...parsed.data, path: normalizeAnalyticsPath(parsed.data.path) };
  const result = await store.collectAnalytics(storeId, payload, {
    countryCode: countryFromRequest(request),
    ip: clientIp(request),
    userAgent: parsed.data.userAgent ?? request.headers.get("user-agent"),
    internalCheckHeader: request.headers.get("x-internal-check"),
    excludeCookie: excludeCookie(request),
    isAdmin: await isAdmin(),
  });
  return Response.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("internal") === "1") {
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": "ps_analytics_exclude=1; Path=/; Max-Age=31536000; SameSite=Lax",
      },
    });
  }
  return jsonError("Not found", 404);
}
