import { isStoreLive } from "@/lib/go-live/live-stores";
import { siteNoindexEnabled } from "@/lib/next-security-headers";
import { hostMatchesStore } from "@/lib/tenant/domains";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { isStagingPublicHostname } from "@/lib/tenant/origin";
import type { StoreBrand } from "@/lib/tenant/types";

function hostnameOnly(host: string) {
  return host.trim().toLowerCase().split(":")[0] ?? "";
}

function brandCanonicalHost(brand: StoreBrand) {
  return brand.siteDomain.replace(/^https?:\/\//, "").split("/")[0]?.toLowerCase() ?? "";
}

/** Whether this store request should be indexable (robots allow, sitemap, no X-Robots-Tag noindex). */
export function storeRequestIndexable(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (siteNoindexEnabled()) return false;
  if (env.STAGING_NOINDEX === "1") return false;
  if (!isStoreLive(storeId, env)) return false;

  const hostname = hostnameOnly(host);
  if (isStagingPublicHostname(hostname)) return false;

  const builtin = BUILTIN_STORES.find((s) => s.id === storeId);
  const brand = builtin?.brand;
  const domains = builtin?.domains ?? [];
  if (!brand) return false;

  const canonical = brandCanonicalHost(brand);
  if (hostname === canonical || hostname === `www.${canonical}`) return true;

  return hostMatchesStore(host, storeId, domains);
}

export function pageRobotsNoindex(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return !storeRequestIndexable(storeId, host, env);
}
