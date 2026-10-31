import { requireAdminPost } from "@/lib/adminAuth";
import { recomputeRollup } from "@/lib/db/analytics-methods";
import { getSql } from "@/lib/db/client";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) return jsonError("Postgres required.", 501);
  const body = await request.json().catch(() => ({}));
  const storeId = typeof body.storeId === "string" ? body.storeId : "fixmonger";
  const sql = getSql();
  const rows = await sql<{ day: string }[]>`
    select distinct started_at::date::text as day
    from visitor_sessions
    where store_id = ${storeId}
    order by 1
  `;
  for (const row of rows) {
    await recomputeRollup(storeId, row.day.slice(0, 10));
  }
  return Response.json({ ok: true, storeId, days: rows.length });
}
