#!/usr/bin/env tsx
/**
 * Recompute analytics_daily_rollups from visitor_sessions + visitor_events.
 * Usage: npm run rebuild:rollups [--store fixmonger] [--from 2026-01-01] [--to 2026-12-31]
 */
import { recomputeRollup } from "../lib/db/analytics-methods";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const storeIdx = args.indexOf("--store");
  const fromIdx = args.indexOf("--from");
  const toIdx = args.indexOf("--to");
  const storeId = storeIdx >= 0 ? args[storeIdx + 1] : "all";
  const from = fromIdx >= 0 ? args[fromIdx + 1] : null;
  const to = toIdx >= 0 ? args[toIdx + 1] : null;

  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const storeFilter =
      storeId && storeId !== "all" ? sql`and store_id = ${storeId}` : sql``;
    const rows = await sql<{ store_id: string; day: string }[]>`
      select distinct store_id, started_at::date::text as day
      from visitor_sessions
      where started_at is not null
      ${storeFilter}
      ${from ? sql`and started_at::date >= ${from}::date` : sql``}
      ${to ? sql`and started_at::date <= ${to}::date` : sql``}
      order by 1, 2
    `;
    let n = 0;
    for (const row of rows) {
      await recomputeRollup(row.store_id, row.day.slice(0, 10));
      n += 1;
      if (n % 50 === 0) console.log(`rebuilt ${n} rollups…`);
    }
    console.log(`Done. Rebuilt ${n} daily rollup(s).`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
