import { syncAllOpenPartnerOrders } from "@/lib/jinglefold/fulfillment";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return jsonError("Unauthorized", 401);
  const synced = await syncAllOpenPartnerOrders("jinglefold");
  return Response.json({ ok: true, synced });
}
