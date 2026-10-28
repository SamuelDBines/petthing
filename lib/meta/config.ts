import { storeAllowsMetaAds } from "@/lib/go-live/live-stores";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import type { StoreBrand } from "@/lib/tenant/types";

function envKey(storeId: string, suffix: string) {
  return `${suffix}_${storeId.replace(/-/g, "_").toUpperCase()}`;
}

function readEnv(key: string, env: NodeJS.ProcessEnv = process.env) {
  const v = env[key]?.trim();
  return v || null;
}

export function metaPixelId(
  storeId: string,
  host: string,
  env: NodeJS.ProcessEnv = process.env,
  brand?: StoreBrand,
) {
  if (!storeAllowsMetaAds(storeId, host, env)) return null;
  return (
    readEnv(envKey(storeId, "META_PIXEL_ID"), env) ||
    brand?.meta?.pixelId?.trim() ||
    (storeId === "pawtraitry" ? readEnv("NEXT_PUBLIC_META_PIXEL_ID", env) : null)
  );
}

export function metaCapiToken(storeId: string, host: string, env: NodeJS.ProcessEnv = process.env) {
  if (!storeAllowsMetaAds(storeId, host, env)) return null;
  return readEnv(envKey(storeId, "META_CAPI_TOKEN"), env);
}

export function metaTestEventCode(storeId: string, env: NodeJS.ProcessEnv = process.env) {
  return readEnv(envKey(storeId, "META_TEST_EVENT_CODE"), env) || readEnv("META_TEST_EVENT_CODE", env);
}

export function metaDomainVerification(storeId: string, env: NodeJS.ProcessEnv = process.env, brand?: StoreBrand) {
  return (
    readEnv(envKey(storeId, "META_DOMAIN_VERIFICATION"), env) ||
    brand?.meta?.domainVerification?.trim() ||
    null
  );
}

export function metaConfiguredForStore(
  storeId: string,
  host: string,
  env: NodeJS.ProcessEnv = process.env,
  brand?: StoreBrand,
) {
  return Boolean(metaPixelId(storeId, host, env, brand));
}

export function metaGoLiveWarnings(env: NodeJS.ProcessEnv = process.env) {
  const warnings: { storeId: string; message: string }[] = [];
  for (const store of BUILTIN_STORES) {
    const canonicalHost = store.brand.siteDomain.replace(/^https?:\/\//, "").split("/")[0] ?? "";
    if (!storeAllowsMetaAds(store.id, canonicalHost, env)) continue;
    const pixel = metaPixelId(store.id, canonicalHost, env, store.brand);
    const capi = metaCapiToken(store.id, canonicalHost, env);
    if (pixel && !capi) {
      warnings.push({
        storeId: store.id,
        message: `META_CAPI_TOKEN_${store.id.replace(/-/g, "_").toUpperCase()} missing. server Purchase events will not send`,
      });
    }
    if (capi && !pixel) {
      warnings.push({
        storeId: store.id,
        message: `META_CAPI_TOKEN set but META_PIXEL_ID_${store.id.replace(/-/g, "_").toUpperCase()} missing. CAPI events need a pixel id`,
      });
    }
    if (pixel && !/^[0-9]+$/.test(pixel)) {
      warnings.push({ storeId: store.id, message: "Meta Pixel ID should be numeric" });
    }
  }
  return warnings;
}
