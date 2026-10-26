import { z } from "zod";
import { randomUUID } from "crypto";
import { jsonError, parseBody } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/runtime";
import { getStore } from "@/lib/store";

const schema = z.object({ type: z.literal("create_start") });

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const limit = await store.hitRateLimit(`event:${hashIp(clientIp(request))}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return Response.json({ ok: true });
  await store.addEvent({ id: randomUUID(), type: "create_start", orderId: null, createdAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
