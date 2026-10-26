import { APP_NAME } from "@/config/brand";
import { integrations } from "@/lib/runtime";

export async function GET() {
  return Response.json({ ok: true, name: APP_NAME, integrations: integrations() });
}
