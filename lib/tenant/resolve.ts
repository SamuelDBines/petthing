import { BUILTIN_STORES, builtinStore } from "@/lib/tenant/defaults";
import { resolveStoreIdFromHostList } from "@/lib/tenant/domains";
import type { StoreConfig } from "@/lib/tenant/types";
import { domainsForStore } from "@/lib/tenant/domains";

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
    brand: { ...base.brand, ...patch.brand },
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
  return { ...merged, domains: domainsForStore(id, [...dbDomains, ...(config?.domains ?? [])]) };
}

export function listBuiltinStores(): StoreConfig[] {
  return BUILTIN_STORES;
}
