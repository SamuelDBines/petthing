import { requireAdminPost } from "@/lib/adminAuth";
import { runQueue } from "@/lib/generation";

export async function POST(request: Request) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  return Response.json(await runQueue());
}
