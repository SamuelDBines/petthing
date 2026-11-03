import { signOut } from "@/auth";
import { clearAdminSession } from "@/lib/adminAuth";

export async function POST() {
  await clearAdminSession();
  await signOut({ redirect: false });
  return Response.json({ ok: true });
}
