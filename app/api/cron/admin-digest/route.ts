import { sendAdminDigestEmail } from "@/lib/ops/admin-digest";
import { assertCron } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    assertCron(request);
  } catch {
    return new Response("Unauthorised", { status: 401 });
  }
  const result = await sendAdminDigestEmail();
  return Response.json({ ok: true, ...result });
}

export const POST = GET;
