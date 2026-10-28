import { z } from "zod";
import { jsonError, parseBody } from "@/lib/http";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, hashIp } from "@/lib/runtime";
import { recordEmailSignup } from "@/lib/crm/record-signup";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";

const schema = z.object({
  email: z.string().email(),
  source: z.enum(["newsletter"]).default("newsletter"),
  marketingConsent: z.boolean(),
  name: z.string().max(120).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  referrer: z.string().max(500).optional(),
  visitorSessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.marketingConsent) return jsonError("Marketing consent is required.", 400);
  const store = getStore();
  const storeId = await requestStoreId();
  const limits = rateLimits();
  const limit = await store.hitRateLimit(
    `signup:${storeId}:${hashIp(clientIp(request))}`,
    limits.analyticsPerMinute,
    60 * 1000,
  );
  if (!limit.ok) return jsonError("Too many attempts. Try again shortly.", 429);
  await recordEmailSignup({
    storeId,
    email: parsed.data.email,
    source: parsed.data.source,
    name: parsed.data.name,
    marketingConsent: true,
    utm: parsed.data.utm,
    referrer: parsed.data.referrer,
    visitorSessionId: parsed.data.visitorSessionId,
  });
  return Response.json({ ok: true });
}
