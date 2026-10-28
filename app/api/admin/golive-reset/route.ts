import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { goliveResetCounts, resolveStoreScope } from "@/lib/golive/reset";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const storeArg = url.searchParams.get("store") || (await adminStoreFilter());
  const storeIds = resolveStoreScope(storeArg === "all" ? "all" : storeArg);
  const counts = await goliveResetCounts(storeIds);
  return Response.json({ dryRun: true, store: storeArg, storeIds, counts });
}
