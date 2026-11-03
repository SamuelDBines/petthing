import { isStoreLive } from "@/lib/go-live/live-stores";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { isStagingPublicHostname } from "@/lib/tenant/origin";
import type { StoreBrand } from "@/lib/tenant/types";

export function hostnameOnly(host: string) {
  return host.trim().toLowerCase().split(":")[0] ?? "";
}

function brandCanonicalHost(brand: StoreBrand) {
  return brand.siteDomain.replace(/^https?:\/\//, "").split("/")[0]?.toLowerCase() ?? "";
}

/** Live Stripe, Prodigi, Meta, and ungated email only on canonical production host for LIVE_STORES. */
export function storeLiveOnCanonicalHost(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isStoreLive(storeId, env)) return false;
  const hostname = hostnameOnly(host);
  if (!hostname || isStagingPublicHostname(hostname)) return false;
  const builtin = BUILTIN_STORES.find((s) => s.id === storeId);
  if (!builtin) return false;
  const canonical = brandCanonicalHost(builtin.brand);
  return hostname === canonical || hostname === `www.${canonical}`;
}

export function requestHostIsStaging(host: string) {
  const hostname = hostnameOnly(host);
  return !hostname || isStagingPublicHostname(hostname);
}
