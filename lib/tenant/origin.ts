import type { StoreBrand } from "@/lib/tenant/types";
import { hostMatchesStore } from "@/lib/tenant/domains";

function requestHost(request: Request) {
  const raw = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return raw.split(",")[0]?.trim() ?? "";
}

function requestProto(request: Request, host: string) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "https";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return "http";
  return "https";
}

/** Public base URL for Stripe redirects and emails — respects the store hostname when it matches. */
export function publicOriginForStore(
  request: Request,
  brand: StoreBrand,
  storeId: string,
  dbOrAdminDomains: string[] = [],
) {
  const host = requestHost(request);
  if (host && hostMatchesStore(host, storeId, dbOrAdminDomains)) {
    return `${requestProto(request, host)}://${host}`;
  }
  const perStore = process.env[`NEXT_PUBLIC_APP_URL_${storeId.replace(/-/g, "_").toUpperCase()}`]?.trim();
  if (perStore) return perStore.replace(/\/$/, "");
  const global = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (global && storeId === "pawtraitry") return global.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production" && host) {
    return `${requestProto(request, host)}://${host}`;
  }
  return `https://${brand.siteDomain}`;
}
