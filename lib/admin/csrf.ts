import { canonicalAdminHost } from "@/lib/admin/canonical";
import { jsonError } from "@/lib/http";

function hostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Reject cross-site admin POSTs when Origin/Referer do not match the admin host. */
export function assertAdminPostOrigin(request: Request) {
  const expected = canonicalAdminHost();
  if (!expected) return null;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin || referer;
  if (!source) {
    return jsonError("Missing Origin header.", 403);
  }
  const host = hostFromUrl(source);
  if (!host || host !== expected) {
    return jsonError("Cross-site admin request blocked.", 403);
  }
  return null;
}
