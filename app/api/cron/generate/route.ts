import { runQueue } from "@/lib/generation";
import { jsonError } from "@/lib/http";
import { assertCron } from "@/lib/runtime";
import { withTransientRetries } from "@/lib/transientErrors";

async function handle(request: Request) {
  try {
    assertCron(request);
  } catch {
    return jsonError("Unauthorised", 401);
  }
  const result = await withTransientRetries(() => runQueue());
  return Response.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
