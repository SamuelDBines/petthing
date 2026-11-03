import { getSql } from "@/lib/db/client";

type Row = { id: string; domains: string[] };

let cache: { at: number; rows: Row[] } | null = null;
const TTL_MS = 60_000;

export async function cachedStoreDomainRows(): Promise<Row[]> {
  if (!process.env.DATABASE_URL) return [];
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.rows;
  try {
    const sql = getSql();
    const rows = await sql<{ id: string; domains: string[] | null }[]>`
      select id, domains from stores
    `;
    const mapped = rows.map((row) => ({ id: row.id, domains: row.domains ?? [] }));
    cache = { at: now, rows: mapped };
    return mapped;
  } catch {
    return cache?.rows ?? [];
  }
}

export function bustStoreDomainCache() {
  cache = null;
}
