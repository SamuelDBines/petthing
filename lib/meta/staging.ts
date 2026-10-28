import { metaTestEventCode } from "@/lib/meta/config";

export function isMetaStagingSurface(env: NodeJS.ProcessEnv = process.env) {
  if (env.META_FORCE_LIVE === "true") return false;
  const admin = (env.ADMIN_URL || "").toLowerCase();
  if (admin.includes("bishop-co-tech.co.uk")) return true;
  if (env.VERCEL_ENV === "preview") return true;
  if (env.STAGING === "true" || env.STAGING === "1") return true;
  return false;
}

/** Skip CAPI in staging unless a test event code is configured for the store. */
export function metaCapiAllowed(storeId: string, env: NodeJS.ProcessEnv = process.env) {
  if (!isMetaStagingSurface(env)) return true;
  return Boolean(metaTestEventCode(storeId, env));
}
