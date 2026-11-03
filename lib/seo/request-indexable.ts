import { storeLiveOnCanonicalHost } from "@/lib/go-live/store-host-live";
import { siteNoindexEnabled } from "@/lib/next-security-headers";

/** Whether this store request should be indexable (robots allow, sitemap, no X-Robots-Tag noindex). */
export function storeRequestIndexable(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (siteNoindexEnabled()) return false;
  if (env.STAGING_NOINDEX === "1") return false;
  return storeLiveOnCanonicalHost(storeId, host, env);
}

export function pageRobotsNoindex(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return !storeRequestIndexable(storeId, host, env);
}
