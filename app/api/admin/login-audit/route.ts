import { listRecentAdminLogins } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const events = await listRecentAdminLogins(25);
  return Response.json({ events });
}
