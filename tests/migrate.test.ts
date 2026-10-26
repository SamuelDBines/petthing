import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applyMigrations } from "../lib/db/migrate";

const url = process.env.TEST_DATABASE_URL?.trim();

test("applyMigrations runs all SQL files on a fresh database", { skip: !url }, async () => {
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
  const { applied, skipped } = await applyMigrations(testUrl);
  assert.ok(applied.length >= 1, "expected at least one migration applied");
  assert.equal(skipped.length, 0);

  const { skipped: skippedAgain } = await applyMigrations(testUrl);
  assert.equal(skippedAgain.length, applied.length);

  const sql = postgres(testUrl, { max: 1 });
  try {
    const stores = await sql<{ id: string }[]>`select id from stores order by id`;
    assert.ok(stores.some((row) => row.id === "pawtraitry"));
  } finally {
    await sql.end({ timeout: 5 });
    const drop = postgres(adminUrl, { max: 1 });
    try {
      await drop.unsafe(`drop database if exists ${dbName} with (force)`);
    } finally {
      await drop.end({ timeout: 5 });
    }
  }
});
