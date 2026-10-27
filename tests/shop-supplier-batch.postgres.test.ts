import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applyMigrations } from "../lib/db/migrate";

const url = process.env.TEST_DATABASE_URL?.trim();

test(
  "addSupplierBatch persists order_ids uuid[] correctly",
  { skip: !url },
  async () => {
    const postgres = (await import("postgres")).default;
    const adminUrl = process.env.TEST_DATABASE_ADMIN_URL?.trim() || url!.replace(/\/[^/]+$/, "/postgres");
    const dbName = `shop_batch_${randomUUID().replace(/-/g, "")}`;
    const admin = postgres(adminUrl, { max: 1 });
    await admin.unsafe(`create database ${dbName}`);
    await admin.end({ timeout: 5 });

    const testUrl = url!.replace(/\/[^/]+$/, `/${dbName}`);
    process.env.DATABASE_URL = testUrl;
    process.env.DATABASE_SSL_MODE = "disable";
    await applyMigrations(testUrl);

    const { shopDbMethods } = await import("../lib/db/shop-methods");
    const orderA = randomUUID();
    const orderB = randomUUID();
    const batchId = randomUUID();
    await shopDbMethods.createShopOrder({
      id: orderA,
      storeId: "fixmonger",
      email: "batch-test@example.com",
      status: "paid",
      lines: [],
      shipping: null,
      amountPence: 1000,
      shippingPence: 0,
      stripeCheckoutSessionId: null,
      trackingNumber: null,
      supplierBatchId: null,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    });
    await shopDbMethods.createShopOrder({
      id: orderB,
      storeId: "fixmonger",
      email: "batch-test@example.com",
      status: "paid",
      lines: [],
      shipping: null,
      amountPence: 2000,
      shippingPence: 0,
      stripeCheckoutSessionId: null,
      trackingNumber: null,
      supplierBatchId: null,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    });

    await shopDbMethods.addSupplierBatch({
      id: batchId,
      storeId: "fixmonger",
      supplier: "go_dropship",
      orderIds: [orderA, orderB],
      csv: "sku,qty\n",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });

    const sql = postgres(testUrl, { max: 1 });
    try {
      const rows = await sql<{ order_ids: string[] }[]>`
        select order_ids::text[] as order_ids from supplier_batch_exports where id = ${batchId}::uuid
      `;
      assert.deepEqual(rows[0]?.order_ids.sort(), [orderA, orderB].sort());
    } finally {
      await sql.end({ timeout: 5 });
      const drop = postgres(adminUrl, { max: 1 });
      await drop.unsafe(`drop database if exists ${dbName} with (force)`);
      await drop.end({ timeout: 5 });
    }
  },
);
