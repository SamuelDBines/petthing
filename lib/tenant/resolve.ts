import { BUILTIN_STORES, DEFAULT_STORE_ID, builtinStore } from "@/lib/tenant/defaults";
import type { StoreConfig } from "@/lib/tenant/types";

function normalizeHost(host: string) {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0];
  return withoutPort;
}

export function resolveStoreIdFromHost(host: string, storeQuery?: string | null): string {
  if (process.env.NODE_ENV !== "production" && storeQuery) {
    const fromQuery = builtinStore(storeQuery.trim());
    if (fromQuery) return fromQuery.id;
  }
  const hostname = normalizeHost(host);
  for (const store of BUILTIN_STORES) {
    if (store.domains.some((domain) => normalizeHost(domain) === hostname || domain === host.toLowerCase())) {
      return store.id;
    }
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return DEFAULT_STORE_ID;
  return DEFAULT_STORE_ID;
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

export function configFromRow(id: string, config: Partial<StoreConfig> | null): StoreConfig {
  const builtin = builtinStore(id);
  if (!builtin) throw new Error(`Unknown store ${id}`);
  return mergeStoreConfig(builtin, config ?? undefined);
}

export function listBuiltinStores(): StoreConfig[] {
  return BUILTIN_STORES;
}
