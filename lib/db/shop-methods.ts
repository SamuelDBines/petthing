import { randomUUID } from "crypto";
import type { ShopOrder, SupplierBatchExport } from "@/lib/catalogue/types";
import type { HandPaintedOrderRow } from "@/lib/handPainted";
import { getSql } from "@/lib/db/client";
import { insertSupplierBatchRow } from "@/lib/db/pg-uuid-array";

function toShopOrder(row: Record<string, unknown>): ShopOrder {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    email: String(row.email),
    status: row.status as ShopOrder["status"],
    lines: row.lines as ShopOrder["lines"],
    shipping: (row.shipping as ShopOrder["shipping"]) ?? null,
    amountPence: Number(row.amount_pence),
    shippingPence: Number(row.shipping_pence ?? 0),
    stripeCheckoutSessionId: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : null,
    stripePaymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    stripeLivemode: row.stripe_livemode == null ? null : Boolean(row.stripe_livemode),
    amountRefundedPence: Number(row.amount_refunded_pence ?? 0),
    trackingNumber: row.tracking_number ? String(row.tracking_number) : null,
    supplierBatchId: row.supplier_batch_id ? String(row.supplier_batch_id) : null,
    marketingConsent: Boolean(row.marketing_consent),
    abandonedReminderSentAt: row.abandoned_reminder_sent_at
      ? new Date(row.abandoned_reminder_sent_at as string).toISOString()
      : null,
    shippedAt: row.shipped_at ? new Date(row.shipped_at as string).toISOString() : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string).toISOString() : null,
    fulfillmentError: row.fulfillment_error ? String(row.fulfillment_error) : null,
    dispatchedEmailSentAt: row.dispatched_email_sent_at
      ? new Date(row.dispatched_email_sent_at as string).toISOString()
      : null,
    supplierCancelRequestedAt: row.supplier_cancel_requested_at
      ? new Date(row.supplier_cancel_requested_at as string).toISOString()
      : null,
    createdAt: new Date(row.created_at as string).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at as string).toISOString() : null,
  };
}

export const shopDbMethods = {
  async createShopOrder(order: ShopOrder) {
    await getSql()`
      insert into shop_orders (
        id, store_id, email, status, lines, shipping, amount_pence, shipping_pence,
        stripe_checkout_session_id, stripe_payment_intent_id, stripe_livemode, amount_refunded_pence,
        marketing_consent, created_at, paid_at
      )
      values (
        ${order.id}::uuid, ${order.storeId}, ${order.email}, ${order.status}, ${JSON.stringify(order.lines)}::jsonb,
        ${order.shipping ? JSON.stringify(order.shipping) : null}::jsonb,
        ${order.amountPence}, ${order.shippingPence}, ${order.stripeCheckoutSessionId}, ${order.stripePaymentIntentId ?? null},
        ${order.stripeLivemode ?? null}, ${order.amountRefundedPence ?? 0}, ${order.marketingConsent ?? false}, ${order.createdAt}, ${order.paidAt}
      )
    `;
    return order;
  },
  async getShopOrder(id: string) {
    const rows = await getSql()`select * from shop_orders where id = ${id}::uuid limit 1`;
    return rows[0] ? toShopOrder(rows[0] as Record<string, unknown>) : null;
  },
  async getShopOrderBySession(sessionId: string) {
    const rows = await getSql()`select * from shop_orders where stripe_checkout_session_id = ${sessionId} limit 1`;
    return rows[0] ? toShopOrder(rows[0] as Record<string, unknown>) : null;
  },
  async updateShopOrder(id: string, patch: Partial<ShopOrder>) {
    const current = await this.getShopOrder(id);
    if (!current) throw new Error("Shop order not found");
    const next = { ...current, ...patch };
    await getSql()`
      update shop_orders set
        status = ${next.status},
        shipping = ${next.shipping ? JSON.stringify(next.shipping) : null}::jsonb,
        stripe_checkout_session_id = ${next.stripeCheckoutSessionId},
        stripe_payment_intent_id = ${next.stripePaymentIntentId ?? null},
        stripe_livemode = ${next.stripeLivemode ?? null},
        amount_refunded_pence = ${next.amountRefundedPence ?? 0},
        tracking_number = ${next.trackingNumber},
        supplier_batch_id = ${next.supplierBatchId},
        marketing_consent = ${next.marketingConsent ?? false},
        abandoned_reminder_sent_at = ${next.abandonedReminderSentAt ?? null},
        shipped_at = ${next.shippedAt ?? null},
        delivered_at = ${next.deliveredAt ?? null},
        fulfillment_error = ${next.fulfillmentError ?? null},
        dispatched_email_sent_at = ${next.dispatchedEmailSentAt ?? null},
        supplier_cancel_requested_at = ${next.supplierCancelRequestedAt ?? null},
        paid_at = ${next.paidAt}
      where id = ${id}::uuid
    `;
    return next;
  },
  async listShopOrders(storeId?: string | "all", status?: string) {
    const rows =
      storeId && storeId !== "all"
        ? await getSql()`select * from shop_orders where store_id = ${storeId} order by created_at desc`
        : await getSql()`select * from shop_orders order by created_at desc`;
    return (rows as Record<string, unknown>[])
      .map(toShopOrder)
      .filter((o) => !status || o.status === status);
  },
  async addSupplierBatch(batch: SupplierBatchExport) {
    const sql = getSql();
    await insertSupplierBatchRow(sql, {
      id: batch.id,
      storeId: batch.storeId,
      supplier: batch.supplier,
      orderIds: batch.orderIds,
      csv: batch.csv,
      createdAt: batch.createdAt,
      submittedAt: batch.submittedAt,
    });
    return batch;
  },
  async listSupplierBatches(storeId: string) {
    const rows = await getSql()`
      select * from supplier_batch_exports where store_id = ${storeId} order by created_at desc
    `;
    return rows as unknown as SupplierBatchExport[];
  },
  async updateSupplierBatch(id: string, patch: Partial<SupplierBatchExport>) {
    if (patch.submittedAt) {
      await getSql()`update supplier_batch_exports set submitted_at = ${patch.submittedAt} where id = ${id}::uuid`;
    }
    const rows = await getSql()`select * from supplier_batch_exports where id = ${id}::uuid limit 1`;
    return rows[0] as SupplierBatchExport;
  },
  async upsertHandPaintedOrder(row: HandPaintedOrderRow) {
    await getSql()`
      insert into hand_painted_orders (order_id, store_id, status, size_label, customer_notes, supplier_email_draft, proof_token, proof_asset_url, tracking_number, updated_at, created_at)
      values (
        ${row.orderId}::uuid, ${row.storeId}, ${row.status}, ${row.sizeLabel}, ${row.customerNotes},
        ${row.supplierEmailDraft}, ${row.proofToken}, ${row.proofAssetUrl}, ${row.trackingNumber},
        ${row.updatedAt}, ${row.createdAt}
      )
      on conflict (order_id) do update set
        status = excluded.status,
        supplier_email_draft = excluded.supplier_email_draft,
        proof_asset_url = excluded.proof_asset_url,
        tracking_number = excluded.tracking_number,
        updated_at = excluded.updated_at
    `;
    return row;
  },
  async getHandPaintedOrder(orderId: string) {
    const rows = await getSql()`select * from hand_painted_orders where order_id = ${orderId}::uuid limit 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return mapHandPainted(row);
  },
  async getHandPaintedByProofToken(token: string) {
    const rows = await getSql()`select * from hand_painted_orders where proof_token = ${token} limit 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return mapHandPainted(row);
  },
  async listHandPaintedOrders(storeId?: string | "all") {
    const rows =
      storeId && storeId !== "all"
        ? await getSql()`select * from hand_painted_orders where store_id = ${storeId} order by created_at desc`
        : await getSql()`select * from hand_painted_orders order by created_at desc`;
    return (rows as Record<string, unknown>[]).map(mapHandPainted);
  },
};

function mapHandPainted(row: Record<string, unknown>): HandPaintedOrderRow {
  return {
    orderId: String(row.order_id),
    storeId: String(row.store_id),
    status: row.status as HandPaintedOrderRow["status"],
    sizeLabel: String(row.size_label),
    customerNotes: String(row.customer_notes ?? ""),
    supplierEmailDraft: String(row.supplier_email_draft ?? ""),
    proofToken: String(row.proof_token),
    proofAssetUrl: row.proof_asset_url ? String(row.proof_asset_url) : null,
    trackingNumber: row.tracking_number ? String(row.tracking_number) : null,
    updatedAt: new Date(row.updated_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function newSupplierBatchId() {
  return randomUUID();
}
