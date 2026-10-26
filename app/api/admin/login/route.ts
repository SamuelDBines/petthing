import { z } from "zod";
import { passwordMatches, startAdminSession } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (!process.env.ADMIN_PASSWORD) return jsonError("Set ADMIN_PASSWORD before using admin.", 503);
  if (!passwordMatches(parsed.data.password)) return jsonError("Wrong password.", 401);
  await startAdminSession();
  return Response.json({ ok: true });
}
