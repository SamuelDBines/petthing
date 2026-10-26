import { BUILTIN_STORES, DEFAULT_STORE_ID, builtinStore } from "@/lib/tenant/defaults";

function normalizeHost(host: string) {
  const trimmed = host.trim().toLowerCase();
  return trimmed.split(":")[0];
}

function parseExtraDomainsEnv(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const json = process.env.STORE_EXTRA_DOMAINS?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, string[] | string>;
      for (const [id, value] of Object.entries(parsed)) {
        out[id] = Array.isArray(value) ? value : value.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return out;
    } catch {
      // Fall through to per-store vars.
    }
  }
  for (const store of BUILTIN_STORES) {
    const key = `STORE_EXTRA_DOMAINS_${store.id.replace(/-/g, "_").toUpperCase()}`;
    const raw = process.env[key]?.trim();
    if (raw) {
      out[store.id] = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
}

const extraFromEnv = () => parseExtraDomainsEnv();

/** Hostnames that resolve to this store (builtin + DB/admin + env). */
export function domainsForStore(storeId: string, dbOrAdminDomains: string[] = []) {
  const builtin = builtinStore(storeId)?.domains ?? [];
  const extra = extraFromEnv()[storeId] ?? [];
  const merged = [...builtin, ...dbOrAdminDomains, ...extra];
  return [...new Set(merged.map(normalizeHost).filter(Boolean))];
}

export function hostMatchesStore(host: string, storeId: string, dbOrAdminDomains: string[] = []) {
  const hostname = normalizeHost(host);
  return domainsForStore(storeId, dbOrAdminDomains).some((domain) => domain === hostname);
}

export function resolveStoreIdFromHostList(
  host: string,
  storeQuery?: string | null,
  dbRows?: { id: string; domains: string[] }[],
) {
  if (process.env.NODE_ENV !== "production" && storeQuery) {
    const query = storeQuery.trim() === "wildframe" ? "fixmonger" : storeQuery.trim();
    const fromQuery = builtinStore(query);
    if (fromQuery) return fromQuery.id;
  }
  const hostname = normalizeHost(host);
  const candidates = BUILTIN_STORES.map((store) => {
    const rowDomains = dbRows?.find((row) => row.id === store.id)?.domains ?? [];
    return { id: store.id, domains: domainsForStore(store.id, rowDomains) };
  });
  for (const extraId of Object.keys(extraFromEnv())) {
    if (!candidates.some((c) => c.id === extraId)) {
      const rowDomains = dbRows?.find((row) => row.id === extraId)?.domains ?? [];
      candidates.push({ id: extraId, domains: domainsForStore(extraId, rowDomains) });
    }
  }
  for (const row of dbRows ?? []) {
    if (!candidates.some((c) => c.id === row.id)) {
      candidates.push({ id: row.id, domains: domainsForStore(row.id, row.domains) });
    }
  }
  for (const candidate of candidates) {
    if (candidate.domains.some((domain) => domain === hostname)) return candidate.id;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return DEFAULT_STORE_ID;
  return DEFAULT_STORE_ID;
}
