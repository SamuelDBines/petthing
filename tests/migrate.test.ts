import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applyMigrations } from "../lib/db/migrate";

const url = process.env.TEST_DATABASE_URL?.trim();

async function withFreshDatabase(run: (testUrl: string) => Promise<void>) {
  const postgres = (await import("postgres")).default;
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL?.trim() || url!.replace(/\/[^/]+$/, "/postgres");
  const dbName = `migrate_test_${randomUUID().replace(/-/g, "")}`;
  const admin = postgres(adminUrl, { max: 1 });
  try {
    await admin.unsafe(`create database ${dbName}`);
  } finally {
    await admin.end({ timeout: 5 });
  }

  const testUrl = url!.replace(/\/[^/]+$/, `/${dbName}`);
  try {
    await run(testUrl);
  } finally {
    const drop = postgres(adminUrl, { max: 1 });
    try {
      await drop.unsafe(`drop database if exists ${dbName} with (force)`);
    } finally {
      await drop.end({ timeout: 5 });
    }
  }
}

test("applyMigrations runs all SQL files on a fresh database", { skip: !url }, async () => {
  await withFreshDatabase(async (testUrl) => {
    const { applied, skipped } = await applyMigrations(testUrl);
    assert.ok(applied.length >= 1, "expected at least one migration applied");
    assert.equal(skipped.length, 0);

    const { skipped: skippedAgain } = await applyMigrations(testUrl);
    assert.equal(skippedAgain.length, applied.length);

    const postgres = (await import("postgres")).default;
    const sql = postgres(testUrl, { max: 1 });
    try {
      const stores = await sql<{ id: string }[]>`select id from stores order by id`;
      assert.ok(stores.some((row) => row.id === "pawtraitry"));
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});

test("0010 migration applies on DB stopped at 0009 (staging upgrade path)", { skip: !url }, async () => {
  await withFreshDatabase(async (testUrl) => {
    const stopBefore = "0010_deactivate_hb76661.sql";
    const first = await applyMigrations(testUrl, undefined, { stopBefore });
    assert.ok(first.applied.includes("0009_admin_login_audit.sql"));
    assert.equal(first.applied.some((f) => f >= stopBefore), false);

    const postgres = (await import("postgres")).default;
    const sql = postgres(testUrl, { max: 1 });
    try {
      await sql`
        insert into catalogue_products (id, store_id, slug, name, category, description, supplier, supplier_sku, cost_pence, price_pence, stock, images, active)
        values ('hb-76661', 'fixmonger', 'folding-clothes-airer', 'Folding clothes airer', 'winter', 'test', 'go_dropship', 'HB-76661', 1228, 3299, 35, '[]'::jsonb, true)
        on conflict (store_id, id) do nothing
      `;
    } finally {
      await sql.end({ timeout: 5 });
    }

    const second = await applyMigrations(testUrl, undefined, {
      stopBefore: "0011_production_fulfillment_gpsr.sql",
    });
    assert.ok(second.applied.includes(stopBefore));

    const sql2 = postgres(testUrl, { max: 1 });
    try {
      const rows = await sql2<{ active: boolean }[]>`
        select active from catalogue_products where store_id = 'fixmonger' and supplier_sku = 'HB-76661'
      `;
      assert.equal(rows[0]?.active, false);
    } finally {
      await sql2.end({ timeout: 5 });
    }
  });
});
