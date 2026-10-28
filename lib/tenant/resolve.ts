import { BUILTIN_STORES, builtinStore } from "@/lib/tenant/defaults";
import { resolveStoreIdFromHostList } from "@/lib/tenant/domains";
import type { StoreConfig } from "@/lib/tenant/types";
import { domainsForStore } from "@/lib/tenant/domains";
import { supportEmailForStore } from "@/lib/tenant/support-email";

export function resolveStoreIdFromHost(
  host: string,
  storeQuery?: string | null,
  dbRows?: { id: string; domains: string[] }[],
): string {
  return resolveStoreIdFromHostList(host, storeQuery, dbRows);
}

export function mergeStoreConfig(base: StoreConfig, patch?: Partial<StoreConfig> | null): StoreConfig {
  // patch is intentionally partial — callers pass DB JSON overrides only.
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    storeType: patch.storeType ?? base.storeType,
    brand: {
      ...base.brand,
      ...patch.brand,
      colors: { ...base.brand.colors, ...patch.brand?.colors },
    },
    catalog: { ...base.catalog, ...patch.catalog },
    settings: { ...base.settings, ...patch.settings },
    integrations: { ...base.integrations, ...patch.integrations },
    themes: patch.themes?.length ? patch.themes : base.themes,
    domains: patch.domains?.length ? patch.domains : base.domains,
  };
}

export function configFromRow(id: string, config: Partial<StoreConfig> | null, dbDomains: string[] = []): StoreConfig {
  const builtin = builtinStore(id);
  if (!builtin) throw new Error(`Unknown store ${id}`);
  const merged = mergeStoreConfig(builtin, config ?? undefined);
  return {
    ...merged,
    storeType: merged.storeType ?? builtin.storeType,
    domains: domainsForStore(id, [...dbDomains, ...(config?.domains ?? [])]),
    brand: {
      ...merged.brand,
      supportEmail: supportEmailForStore(id, merged.brand.supportEmail),
    },
  };
}

export function listBuiltinStores(): StoreConfig[] {
  return BUILTIN_STORES;
}
