import { BUILTIN_STORES } from "@/lib/tenant/defaults";

const DEFAULT_SUPPORT = "hello@pawtraitry.com";

function primaryDomain(domains: string[] = []) {
  const pick = domains.find((domain) => domain && !domain.includes("localhost") && !domain.startsWith("127."));
  if (!pick) return null;
  return pick.replace(/^www\./i, "");
}

export function supportEmailForStore(
  storeId: string,
  options?: { domains?: string[]; brandFallback?: string },
) {
  const envKey = `SUPPORT_EMAIL_${storeId.toUpperCase().replace(/-/g, "_")}`;
  const perStore = process.env[envKey]?.trim();
  if (perStore) return perStore;

  const fromDomain = primaryDomain(options?.domains);
  if (fromDomain) return `hello@${fromDomain}`;

  const brand = options?.brandFallback?.trim();
  if (brand) return brand;

  const builtin = BUILTIN_STORES.find((store) => store.id === storeId);
  const builtinDomain = primaryDomain(builtin?.domains);
  if (builtinDomain) return `hello@${builtinDomain}`;

  return process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT;
}
