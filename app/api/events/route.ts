import { z } from "zod";
import { randomUUID } from "crypto";
import { jsonError, parseBody } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";

const schema = z.object({ type: z.literal("create_start") });

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const storeId = await requestStoreId();
  const limit = await store.hitRateLimit(`event:${storeId}:${hashIp(clientIp(request))}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return Response.json({ ok: true });
  await store.addEvent({
    id: randomUUID(),
    storeId,
    type: "create_start",
    orderId: null,
    createdAt: new Date().toISOString(),
  });
  return Response.json({ ok: true });
}
