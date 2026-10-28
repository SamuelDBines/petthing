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
  const perStore = envStoreAppUrl(storeId);
  if (perStore) return perStore;
  const global = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (global && storeId === "pawtraitry") return global.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production" && host) {
    return `${requestProto(request, host)}://${host}`;
  }
  return storeCanonicalOrigin(storeId, brand, dbOrAdminDomains);
}

function envStoreAppUrl(storeId: string) {
  const key = `NEXT_PUBLIC_APP_URL_${storeId.replace(/-/g, "_").toUpperCase()}`;
  return process.env[key]?.trim().replace(/\/$/, "") || null;
}

export function isStagingPublicHostname(host: string) {
  const h = host.toLowerCase();
  return h.includes("bishop-co-tech.co.uk") || h.includes("dropship.store") || h.endsWith(".vercel.app");
}

function normalizeDomains(domains: string[]) {
  return domains.map((d) => d.trim().toLowerCase()).filter((d) => d && !d.includes("localhost"));
}

/** Canonical public base URL for emails and signed media links (per store, not global NEXT_PUBLIC_APP_URL). */
export function storeCanonicalOrigin(storeId: string, brand: StoreBrand, domains: string[] = []) {
  const perStore = envStoreAppUrl(storeId);
  if (perStore) return perStore;

  const normalized = normalizeDomains(domains);
  const global = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (global) {
    try {
      const globalHost = new URL(global).hostname.toLowerCase();
      if (!globalHost.includes("localhost") && !globalHost.startsWith("127.0.0.1")) {
        const exact = normalized.find((d) => d === globalHost || d === `www.${globalHost}`);
        if (exact) return `https://${exact.replace(/^www\./, "")}`;
        const storeOnGlobal = normalized.find((d) => d.endsWith(`.${globalHost}`));
        if (storeOnGlobal) return `https://${storeOnGlobal.replace(/^www\./, "")}`;
        const prefixed = normalized.find((d) => d.startsWith(`${storeId}.`) && isStagingPublicHostname(d));
        if (prefixed) return `https://${prefixed.replace(/^www\./, "")}`;
        if (storeId === "pawtraitry" && isStagingPublicHostname(globalHost)) return global;
      }
    } catch {
      /* ignore malformed NEXT_PUBLIC_APP_URL */
    }
  }

  const staging = normalized.filter(isStagingPublicHostname);
  if (staging.length) {
    const prefer = staging.find((d) => d.startsWith(`${storeId}.`)) ?? staging[0]!;
    return `https://${prefer.replace(/^www\./, "")}`;
  }

  if (storeId === "pawtraitry") {
    const legacy = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (legacy && /pawtraitry/i.test(legacy)) return legacy.replace(/\/$/, "");
  }

  const publicHosts = normalized.filter((d) => !d.startsWith("www.") && !isStagingPublicHostname(d));
  const host = publicHosts[0] || brand.siteDomain.replace(/^https?:\/\//, "").split("/")[0];
  if (!host) return appUrl();
  return `https://${host}`;
}

/** Build absolute URLs for email assets and links using the store canonical host. */
export function storePublicUrl(origin: string, pathOrUrl: string) {
  const base = origin.replace(/\/$/, "");
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl);
      return `${base}${parsed.pathname}${parsed.search}`;
    } catch {
      return pathOrUrl;
    }
  }
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function mediaSigningBase(storeOrigin: string) {
  const internal = process.env.INTERNAL_APP_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  return storeOrigin.replace(/\/$/, "");
}
