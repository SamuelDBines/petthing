import type { StoreBrand } from "@/lib/tenant/types";
import { hostMatchesStore } from "@/lib/tenant/domains";
import { appUrl } from "@/lib/runtime";

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
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
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

/** Canonical public base URL for emails and signed media links (per store, not global NEXT_PUBLIC_APP_URL). */
export function storeCanonicalOrigin(storeId: string, brand: StoreBrand, domains: string[] = []) {
  const envKey = `NEXT_PUBLIC_APP_URL_${storeId.replace(/-/g, "_").toUpperCase()}`;
  const perStore = process.env[envKey]?.trim();
  if (perStore) return perStore.replace(/\/$/, "");
  if (storeId === "pawtraitry") {
    const global = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (global) return global.replace(/\/$/, "");
  }
  const fromDomains = domains
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d && !d.includes("localhost") && !d.startsWith("www."));
  const host = fromDomains[0] || brand.siteDomain.replace(/^https?:\/\//, "").split("/")[0];
  if (!host) return appUrl();
  return `https://${host}`;
}

export function mediaSigningBase(storeOrigin: string) {
  const internal = process.env.INTERNAL_APP_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  return storeOrigin.replace(/\/$/, "");
}
