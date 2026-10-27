import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applyMigrations } from "../lib/db/migrate";

const url = process.env.TEST_DATABASE_URL?.trim();
const stopBefore = "0014_dedupe_wildframe_store.sql";

async function withFreshDatabase(run: (testUrl: string) => Promise<void>) {
  const postgres = (await import("postgres")).default;
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL?.trim() || url!.replace(/\/[^/]+$/, "/postgres");
  const dbName = `wildframe_mig_${randomUUID().replace(/-/g, "")}`;
  const admin = postgres(adminUrl, { max: 1 });
  await admin.unsafe(`create database ${dbName}`);
  await admin.end({ timeout: 5 });

  const testUrl = url!.replace(/\/[^/]+$/, `/${dbName}`);
  try {
    await run(testUrl);
  } finally {
    const drop = postgres(adminUrl, { max: 1 });
    await drop.unsafe(`drop database if exists ${dbName} with (force)`);
    await drop.end({ timeout: 5 });
  }
}

test("0014 merges wildframe FK rows into fixmonger and deletes wildframe store", { skip: !url }, async () => {
  await withFreshDatabase(async (testUrl) => {
    await applyMigrations(testUrl, undefined, { stopBefore });

    const postgres = (await import("postgres")).default;
    const sql = postgres(testUrl, { max: 1 });
    const day = "2026-10-01";
    const orderId = randomUUID();
    const sessionId = randomUUID();
    const shopOrderId = randomUUID();
    const batchId = randomUUID();

    try {
      await sql`
        insert into stores (id, slug, domains, config)
        values ('wildframe', 'wildframe', array['wildframe.studio'], '{}'::jsonb)
        on conflict (id) do nothing
      `;
      await sql`
        insert into app_settings (store_id, theme_mode, active_theme_id, sales_paused, queue_halted)
        values ('wildframe', 'manual', 'evergreen', false, false)
        on conflict (store_id) do nothing
      `;
      await sql`
        insert into analytics_daily_rollups (store_id, day, metrics)
        values ('wildframe', ${day}::date, '{"uniqueVisitors":3,"sessions":5}'::jsonb)
        on conflict (store_id, day) do nothing
      `;
      await sql`
        insert into analytics_daily_rollups (store_id, day, metrics)
        values ('fixmonger', ${day}::date, '{"uniqueVisitors":10,"sessions":20}'::jsonb)
        on conflict (store_id, day) do update set metrics = excluded.metrics
      `;
      await sql`
        insert into visitor_sessions (
          id, store_id, visitor_id, consent_level, landing_path, started_at, pageview_count, bounced, duration_ms
        )
        values (${sessionId}::uuid, 'wildframe', 'v1', 'aggregate', '/', now(), 1, false, 0)
      `;
      await sql`
        insert into visitor_events (id, store_id, session_id, event_type, created_at)
        values (${randomUUID()}::uuid, 'wildframe', ${sessionId}::uuid, 'pageview', now())
      `;
      await sql`
        insert into catalogue_products (
          id, store_id, slug, name, category, description, supplier, supplier_sku,
          cost_pence, price_pence, stock, images, active
        )
        values (
          'wf-only', 'wildframe', 'wf-only', 'WF only', 'misc', 'x', 'go_dropship', 'WF-1',
          100, 200, 1, '[]'::jsonb, true
        )
        on conflict (store_id, id) do nothing
      `;
      await sql`
        insert into shop_orders (
          id, store_id, email, status, lines, amount_pence, shipping_pence, created_at
        )
        values (
          ${shopOrderId}::uuid, 'wildframe', 'wf@example.com', 'paid', '[]'::jsonb, 999, 0, now()
        )
      `;
      await sql`
        insert into supplier_batch_exports (
          id, store_id, supplier, order_ids, csv, created_at, submitted_at
        )
        values (
          ${batchId}::uuid, 'wildframe', 'go_dropship', array[${shopOrderId}::uuid], 'csv', now(), now()
        )
      `;
      await sql`
        insert into daily_spend (store_id, day, gbp)
        values ('wildframe', '2026-10-02', 1.5)
        on conflict do nothing
      `;
      await sql`
        insert into orders (
          id, store_id, created_at, email, theme_id, subject_type, tier_id, style_ids, status,
          amount_pence, own_referral_code, results_token, upload_token
        )
        values (
          ${orderId}::uuid, 'wildframe', now(), 'p@example.com', 'halloween', 'dog', 'digital',
          array['classic'], 'paid', 1000, 'WFREF', ${randomUUID()}, ${randomUUID()}
        )
      `;
    } finally {
      await sql.end({ timeout: 5 });
    }

    const second = await applyMigrations(testUrl);
    assert.ok(second.applied.includes(stopBefore));

    const sql2 = postgres(testUrl, { max: 1 });
    try {
      const stores = await sql2<{ id: string }[]>`select id from stores where id in ('wildframe', 'fixmonger') order by id`;
      assert.deepEqual(stores.map((r) => r.id), ["fixmonger"]);

      const rollup = await sql2<{ unique_visitors: number }[]>`
        select (metrics->>'uniqueVisitors')::int as unique_visitors
        from analytics_daily_rollups where store_id = 'fixmonger' and day = ${day}::date
      `;
      assert.equal(rollup[0]?.unique_visitors, 13);

      const wfRollup = await sql2`select 1 from analytics_daily_rollups where store_id = 'wildframe'`;
      assert.equal(wfRollup.length, 0);

      const wfSessions = await sql2`select 1 from visitor_sessions where store_id = 'wildframe'`;
      assert.equal(wfSessions.length, 0);

      const shop = await sql2<{ store_id: string }[]>`
        select store_id from shop_orders where id = ${shopOrderId}::uuid
      `;
      assert.equal(shop[0]?.store_id, "fixmonger");

      const cat = await sql2<{ store_id: string }[]>`
        select store_id from catalogue_products where id = 'wf-only'
      `;
      assert.equal(cat[0]?.store_id, "fixmonger");

      const again = await applyMigrations(testUrl);
      assert.ok(again.skipped.includes(stopBefore));
    } finally {
      await sql2.end({ timeout: 5 });
    }
  });
});
