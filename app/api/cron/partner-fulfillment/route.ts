import { syncAllOpenPartnerOrders } from "@/lib/jinglefold/fulfillment";
import { jsonError } from "@/lib/http";
import { assertCron } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    assertCron(request);
  } catch {
    return jsonError("Unauthorized", 401);
  }
  const synced = await syncAllOpenPartnerOrders("jinglefold");
  return Response.json({ ok: true, synced });
}

export const POST = GET;
