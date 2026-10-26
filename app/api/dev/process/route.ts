import { runQueue } from "@/lib/generation";
import { jsonError } from "@/lib/http";

export async function POST() {
  if (process.env.NODE_ENV === "production") return jsonError("Not available.", 404);
  return Response.json(await runQueue());
}
