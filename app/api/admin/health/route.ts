import { isAdmin } from "@/lib/adminAuth";
import { cronJobHealth, integrationHealth } from "@/lib/integrations/health";
import { validateGoLive } from "@/lib/go-live/requirements";
import { jsonError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const goLive = validateGoLive();
  return Response.json({
    integrations: integrationHealth(),
    crons: cronJobHealth(),
    goLive,
  });
}
