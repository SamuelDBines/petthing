import { metaTestEventCode } from "@/lib/meta/config";
import { storeLiveOnCanonicalHost } from "@/lib/go-live/store-host-live";

/** Send CAPI when store is live on canonical host, or META_FORCE_LIVE, or test event code on staging. */
export function metaCapiAllowed(storeId: string, host: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (env.META_FORCE_LIVE === "true") return true;
  if (host && storeLiveOnCanonicalHost(storeId, host, env)) return true;
  return Boolean(metaTestEventCode(storeId, env));
}
