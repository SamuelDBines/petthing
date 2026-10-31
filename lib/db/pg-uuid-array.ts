import type { Sql } from "postgres";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Postgres text array literal for uuid[] columns (driver-safe on all deploy targets). */
export function uuidArrayLiteral(ids: string[]) {
  for (const id of ids) {
    if (!UUID_RE.test(id)) throw new Error(`Invalid UUID for array literal: ${id}`);
  }
  if (!ids.length) return "{}";
  return `{${ids.join(",")}}`;
}

export async function insertSupplierBatchRow(
  sql: Sql,
  batch: {
    id: string;
    storeId: string;
    supplier: string;
    orderIds: string[];
    csv: string;
    createdAt: string;
    submittedAt: string | null;
  },
) {
  await sql.unsafe(
    `insert into supplier_batch_exports (id, store_id, supplier, order_ids, csv, created_at, submitted_at)
     values ($1::uuid, $2, $3, $4::uuid[], $5, $6, $7)`,
    [
      batch.id,
      batch.storeId,
      batch.supplier,
      uuidArrayLiteral(batch.orderIds),
      batch.csv,
      batch.createdAt,
      batch.submittedAt,
    ],
  );
}
