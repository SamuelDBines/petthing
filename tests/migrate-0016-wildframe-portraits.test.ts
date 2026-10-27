import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applyMigrations } from "../lib/db/migrate";

const url = process.env.TEST_DATABASE_URL?.trim();
const stopBefore = "0016_wildframe_portraits_and_supplier_cancel.sql";

test("0016 moves fixmonger portrait orders to pawtraitry", { skip: !url }, async () => {
  const postgres = (await import("postgres")).default;
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL?.trim() || url!.replace(/\/[^/]+$/, "/postgres");
  const dbName = `wf_portrait_${randomUUID().replace(/-/g, "")}`;
  const admin = postgres(adminUrl, { max: 1 });
  await admin.unsafe(`create database ${dbName}`);
  await admin.end({ timeout: 5 });

  const testUrl = url!.replace(/\/[^/]+$/, `/${dbName}`);
  process.env.DATABASE_URL = testUrl;
  process.env.DATABASE_SSL_MODE = "disable";

  try {
    await applyMigrations(testUrl, undefined, { stopBefore });

    const sql = postgres(testUrl, { max: 1 });
    const orderId = randomUUID();
    const eventId = randomUUID();
    try {
      await sql`
        insert into orders (
          id, store_id, created_at, email, theme_id, subject_type, tier_id, style_ids, status,
          amount_pence, own_referral_code, results_token, upload_token
        )
        values (
          ${orderId}::uuid, 'fixmonger', now(), 'wildframe@example.com', 'halloween', 'dog', 'digital',
          array['victorian-portrait'], 'paid', 1999, 'WF1', ${randomUUID()}, ${randomUUID()}
        )
      `;
      await sql`
        insert into events (id, store_id, type, order_id, created_at)
        values (${eventId}::uuid, 'fixmonger', 'paid', ${orderId}::uuid, now())
      `;
    } finally {
      await sql.end({ timeout: 5 });
    }

    const second = await applyMigrations(testUrl, undefined, { stopBefore: "0017_placeholder.sql" });
    assert.ok(second.applied.includes(stopBefore));

    const sql2 = postgres(testUrl, { max: 1 });
    try {
      const order = await sql2<{ store_id: string }[]>`
        select store_id from orders where id = ${orderId}::uuid
      `;
      assert.equal(order[0]?.store_id, "pawtraitry");

      const event = await sql2<{ store_id: string }[]>`
        select store_id from events where id = ${eventId}::uuid
      `;
      assert.equal(event[0]?.store_id, "pawtraitry");

      const { skipped } = await applyMigrations(testUrl, undefined, { stopBefore: "0017_placeholder.sql" });
      assert.ok(skipped.includes(stopBefore));
    } finally {
      await sql2.end({ timeout: 5 });
    }
  } finally {
    const drop = postgres(adminUrl, { max: 1 });
    await drop.unsafe(`drop database if exists ${dbName} with (force)`);
    await drop.end({ timeout: 5 });
  }
});
