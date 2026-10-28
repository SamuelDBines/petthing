import { getSql } from "@/lib/db/client";
import { normalizeEmail, type EmailSignupRow } from "@/lib/crm/merge-persons";
import type { ShopOrder } from "@/lib/catalogue/types";
import type { Order, Preorder } from "@/lib/domain";
import { getStore } from "@/lib/store";

function signupFromRow(row: Record<string, unknown>): EmailSignupRow {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    email: String(row.email),
    source: String(row.source) as EmailSignupRow["source"],
    name: row.name ? String(row.name) : null,
    marketingConsent: Boolean(row.marketing_consent),
    marketingConsentAt: row.marketing_consent_at ? new Date(row.marketing_consent_at as string).toISOString() : null,
    utmSource: row.utm_source ? String(row.utm_source) : null,
    utmMedium: row.utm_medium ? String(row.utm_medium) : null,
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : null,
    referrer: row.referrer ? String(row.referrer) : null,
    excludedFromMetrics: Boolean(row.excluded_from_metrics),
    unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

function shopFromRow(row: Record<string, unknown>): ShopOrder {
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

function preorderFromRow(row: Record<string, unknown>): Preorder {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    orderId: row.order_id ? String(row.order_id) : null,
    email: String(row.email),
    themeId: String(row.theme_id),
    stripeCheckoutSessionId: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : null,
    stripePaymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    amountPence: Number(row.amount_pence),
    status: row.status as Preorder["status"],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function fetchCrmEntitiesForEmail(email: string, storeFilter: string | "all") {
  const key = normalizeEmail(email);
  const sql = getSql();
  const store = getStore();

  const orders =
    storeFilter !== "all"
      ? await sql`select id from orders where lower(email) = ${key} and store_id = ${storeFilter} order by created_at desc`
      : await sql`select id from orders where lower(email) = ${key} order by created_at desc`;
  const shopOrders =
    storeFilter !== "all"
      ? await sql`select * from shop_orders where lower(email) = ${key} and store_id = ${storeFilter} order by created_at desc`
      : await sql`select * from shop_orders where lower(email) = ${key} order by created_at desc`;
  const preorders =
    storeFilter !== "all"
      ? await sql`select * from preorders where lower(email) = ${key} and store_id = ${storeFilter} order by created_at desc`
      : await sql`select * from preorders where lower(email) = ${key} order by created_at desc`;
  const signups =
    storeFilter !== "all"
      ? await sql`select * from email_signups where lower(email) = ${key} and store_id = ${storeFilter} order by created_at desc`
      : await sql`select * from email_signups where lower(email) = ${key} order by created_at desc`;

  const portraitOrders: Order[] = [];
  for (const row of orders as unknown as { id: string }[]) {
    const order = await store.getOrder(row.id);
    if (order) portraitOrders.push(order);
  }

  return {
    orders: portraitOrders,
    shopOrders: (shopOrders as Record<string, unknown>[]).map(shopFromRow),
    preorders: (preorders as Record<string, unknown>[]).map(preorderFromRow),
    signups: (signups as Record<string, unknown>[]).map(signupFromRow),
  };
}
