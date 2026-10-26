import { clearAdminSession } from "@/lib/adminAuth";

export async function POST() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
