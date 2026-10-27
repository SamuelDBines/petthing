import { randomUUID } from "crypto";
import type { ShopOrder } from "@/lib/catalogue/types";
import { alertAdmin } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import { withTransientRetries } from "@/lib/transientErrors";
import { buildGoDropshipCsv } from "@/lib/suppliers/goDropship";
import {
  sendShopOrderConfirmationEmail,
  sendShopOrderDeliveredEmail,
  sendShopOrderDispatchedEmail,
  sendShopOrderSubmittedToSupplierEmail,
  sendShopReviewRequestEmail,
} from "@/lib/shop/emails";
import { sendShopOrderCancelledEmail } from "@/lib/shop/emails";
import { refundShopOrder } from "@/lib/shop/refunds";
import { getStore } from "@/lib/store";

export type ShopCustomerEmailKind =
  | "confirmation"
  | "submitted"
  | "dispatched"
  | "delivered"
  | "review";

export function shopOrderRefundablePence(order: ShopOrder) {
  if (!order.paidAt || order.status === "pending_payment") return 0;
  if (order.status === "refunded" || order.status === "cancelled") return 0;
  return Math.max(0, order.amountPence - (order.amountRefundedPence ?? 0));
}

export function shopOrderNeedsSupplierCancelRequest(order: ShopOrder) {
  return (
    order.status === "submitted_to_supplier" ||
    order.status === "shipped" ||
    Boolean(order.supplierBatchId)
  );
}

export async function cancelShopOrder(
  orderId: string,
  options?: { refund?: boolean; confirmShippedCancel?: boolean },
) {
  const store = getStore();
  const order = await store.getShopOrder(orderId);
  if (!order) throw new Error("Shop order not found");
  if (order.status === "refunded" || order.status === "cancelled") {
    throw new Error("Order is already closed");
  }
  if (order.status === "delivered") {
    throw new Error("Cannot cancel a delivered order — issue a refund instead");
  }
  if (order.status === "shipped" && !options?.confirmShippedCancel) {
    throw new Error("Order has shipped — pass confirmShippedCancel to cancel and refund");
  }

  const shouldRefund = options?.refund ?? true;
  const refundable = shopOrderRefundablePence(order);
  const supplierCancel = shopOrderNeedsSupplierCancelRequest(order);
  const now = new Date().toISOString();

  let refunded = false;
  let updated = order;

  if (shouldRefund && refundable > 0) {
    updated = (await refundShopOrder(orderId)) ?? updated;
    refunded = true;
  }

  const patch: Partial<ShopOrder> = { fulfillmentError: null };
  if (supplierCancel) patch.supplierCancelRequestedAt = now;
  if (updated.status !== "refunded") patch.status = "cancelled";

  updated = await store.updateShopOrder(orderId, patch);

  await sendShopOrderCancelledEmail(updated, refunded, { supplierCancelRequested: supplierCancel });
  if (supplierCancel) {
    await alertAdmin(
      "Supplier cancellation requested",
      `<p>Shop order <code>${orderId}</code> was cancelled after supplier submission. Request cancellation from Go Dropship (batch ${order.supplierBatchId ?? "unknown"}).</p>`,
      order.storeId,
    );
  }
  return updated;
}

async function emailGoDropshipBatch(storeId: string, batchId: string, orders: ShopOrder[], csv: string) {
  const supplierEmail = process.env.GODROPSHIP_ORDERS_EMAIL?.trim();
  if (supplierEmail) {
    await sendEmail({
      to: supplierEmail,
      subject: `Go Dropship order batch ${batchId.slice(0, 8)} — ${orders.length} orders`,
      html: `<p>Automated export from catalogue shop (${storeId}).</p><p>Orders: ${orders.length}</p>`,
      attachments: [{ filename: `godropship-${batchId.slice(0, 8)}.csv`, content: Buffer.from(csv, "utf8") }],
      storeId,
    });
  } else {
    await alertAdmin(
      "Go Dropship batch ready (no GODROPSHIP_ORDERS_EMAIL)",
      `<p>Batch ${batchId} for ${storeId} with ${orders.length} orders. Set GODROPSHIP_ORDERS_EMAIL to email CSV automatically.</p>`,
      storeId,
    );
  }
}

/** Submit one or more paid Go Dropship orders (idempotent per order status). */
export async function submitGoDropshipOrders(orders: ShopOrder[]) {
  const eligible = orders.filter((o) => o.status === "paid" && o.lines.some((l) => l.supplier === "go_dropship"));
  if (!eligible.length) return { submitted: 0, batchId: null as string | null };

  const storeId = eligible[0].storeId;
  const csv = buildGoDropshipCsv(eligible);
  const batch = {
    id: randomUUID(),
    storeId,
    supplier: "go_dropship" as const,
    orderIds: eligible.map((o) => o.id),
    csv,
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
  };

  const store = getStore();
  await withTransientRetries(async () => {
    await store.addSupplierBatch(batch);
    for (const order of eligible) {
      await store.updateShopOrder(order.id, {
        supplierBatchId: batch.id,
        status: "submitted_to_supplier",
        fulfillmentError: null,
      });
      const fresh = await store.getShopOrder(order.id);
      if (fresh) await sendShopOrderSubmittedToSupplierEmail(fresh);
    }
  });

  await emailGoDropshipBatch(storeId, batch.id, eligible, csv);
  return { submitted: eligible.length, batchId: batch.id };
}

export async function resubmitShopOrder(orderId: string) {
  const store = getStore();
  const order = await store.getShopOrder(orderId);
  if (!order) throw new Error("Shop order not found");
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("Cannot resubmit a cancelled or refunded order");
  }

  const hasGo = order.lines.some((l) => l.supplier === "go_dropship");
  if (!hasGo) {
    throw new Error("Resubmit is only supported for Go Dropship catalogue orders");
  }

  if (order.status === "paid") {
    return submitGoDropshipOrders([order]);
  }

  if (order.status === "submitted_to_supplier" || order.fulfillmentError) {
    const csv = buildGoDropshipCsv([order]);
    const batchId = order.supplierBatchId ?? randomUUID();
    await emailGoDropshipBatch(order.storeId, batchId, [order], csv);
    await store.updateShopOrder(orderId, { fulfillmentError: null });
    return { submitted: 1, batchId };
  }

  throw new Error("Order is not in a state that can be resubmitted");
}

export async function resendShopCustomerEmail(orderId: string, kind: ShopCustomerEmailKind) {
  const order = await getStore().getShopOrder(orderId);
  if (!order) throw new Error("Shop order not found");
  switch (kind) {
    case "confirmation":
      await sendShopOrderConfirmationEmail(order);
      break;
    case "submitted":
      await sendShopOrderSubmittedToSupplierEmail(order);
      break;
    case "dispatched":
      await sendShopOrderDispatchedEmail(order);
      break;
    case "delivered":
      await sendShopOrderDeliveredEmail(order);
      break;
    case "review":
      await sendShopReviewRequestEmail(order);
      break;
    default:
      throw new Error("Unknown email kind");
  }
}

export function canEditShopShipping(order: ShopOrder) {
  return order.status === "paid" || order.status === "submitted_to_supplier";
}
