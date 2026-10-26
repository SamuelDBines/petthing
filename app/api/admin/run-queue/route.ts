import { requireAdmin } from "@/lib/adminAuth";
import { runQueue } from "@/lib/generation";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(await runQueue());
}
