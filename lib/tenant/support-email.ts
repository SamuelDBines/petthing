const DEFAULT_SUPPORT = "hello@pawtraitry.com";

export function supportEmailForStore(storeId: string, fallback?: string) {
  const envKey = `SUPPORT_EMAIL_${storeId.toUpperCase().replace(/-/g, "_")}`;
  return process.env[envKey]?.trim() || process.env.SUPPORT_EMAIL?.trim() || fallback || DEFAULT_SUPPORT;
}
