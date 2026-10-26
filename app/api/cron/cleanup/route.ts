import { cleanupExpired } from "@/lib/cleanup";
import { jsonError } from "@/lib/http";
import { assertCron } from "@/lib/runtime";

async function handle(request: Request) {
  try {
    assertCron(request);
  } catch {
    return jsonError("Unauthorised", 401);
  }
  return Response.json(await cleanupExpired());
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
