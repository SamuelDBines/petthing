import { z } from "zod";
import { recordAdminLogin } from "@/lib/admin/audit";
import { passwordLoginEnabled, passwordMatches, startAdminSession } from "@/lib/adminAuth";
import { clientIp } from "@/lib/runtime";
import { jsonError, parseBody } from "@/lib/http";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  if (!passwordLoginEnabled()) {
    return jsonError("Password admin login is disabled. Use Sign in with Google.", 403);
  }
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (!passwordMatches(parsed.data.password)) return jsonError("Wrong password.", 401);
  await startAdminSession();
  await recordAdminLogin("password-login", clientIp(request));
  return Response.json({ ok: true });
}
