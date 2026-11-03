import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { goliveResetCounts, resolveStoreScope } from "@/lib/golive/reset";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const storeArg = url.searchParams.get("store") || (await adminStoreFilter());
  if (storeArg === "all") {
    return jsonError("Pick a single store for go-live reset preview (not all).", 400);
  }
  const storeIds = resolveStoreScope(storeArg);
  const counts = await goliveResetCounts(storeIds);
  return Response.json({ dryRun: true, store: storeArg, storeIds, counts });
}
