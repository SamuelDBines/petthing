import { z } from "zod";
import { requireAdminPost } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import {
  cancelShopOrder,
  canEditShopShipping,
  resendShopCustomerEmail,
  resubmitShopOrder,
  type ShopCustomerEmailKind,
} from "@/lib/shop/admin-order-actions";
import { refundShopOrder } from "@/lib/shop/refunds";
import { sendShopOrderDeliveredEmail, sendShopOrderDispatchedEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";

const postSchema = z.object({
  action: z.enum([
    "refund_full",
    "refund_partial",
    "cancel",
    "resubmit",
    "resend_email",
  ]),
  amountPence: z.number().int().positive().optional(),
  emailKind: z
    .enum(["confirmation", "submitted", "dispatched", "delivered", "review"])
    .optional(),
});

const patchSchema = z.object({
  trackingNumber: z.string().min(3).optional(),
  status: z.enum(["shipped", "delivered", "submitted_to_supplier", "paid", "cancelled"]).optional(),
  shipping: z
    .object({
      name: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      postalCode: z.string().min(1),
      countryCode: z.string().min(2),
    })
    .optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(postSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const order = await getStore().getShopOrder(id);
  if (!order) return jsonError("Shop order not found.", 404);
  try {
    if (parsed.data.action === "refund_full") {
      await refundShopOrder(id);
    } else if (parsed.data.action === "refund_partial") {
      if (!parsed.data.amountPence) return jsonError("amountPence required for partial refund.");
      await refundShopOrder(id, parsed.data.amountPence);
    } else if (parsed.data.action === "cancel") {
      await cancelShopOrder(id);
    } else if (parsed.data.action === "resubmit") {
      await resubmitShopOrder(id);
    } else if (parsed.data.action === "resend_email") {
      if (!parsed.data.emailKind) return jsonError("emailKind required for resend_email.");
      await resendShopCustomerEmail(id, parsed.data.emailKind as ShopCustomerEmailKind);
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Action failed", 400);
  }
  return Response.json({ ok: true, order: await getStore().getShopOrder(id) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(patchSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const order = await store.getShopOrder(id);
  if (!order) return jsonError("Shop order not found.", 404);
  const now = new Date().toISOString();
  const patch: Partial<typeof order> = {};
  if (parsed.data.trackingNumber) patch.trackingNumber = parsed.data.trackingNumber;
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.status === "shipped") patch.shippedAt = now;
  if (parsed.data.status === "delivered") patch.deliveredAt = now;
  if (parsed.data.shipping) {
    if (!canEditShopShipping(order)) {
      return jsonError("Shipping address can only be edited before dispatch.", 400);
    }
    patch.shipping = {
      name: parsed.data.shipping.name,
      line1: parsed.data.shipping.line1,
      line2: parsed.data.shipping.line2 ?? "",
      city: parsed.data.shipping.city,
      postalCode: parsed.data.shipping.postalCode,
      countryCode: parsed.data.shipping.countryCode,
    };
  }
  const updated = await store.updateShopOrder(id, patch);
  if (parsed.data.status === "shipped" || parsed.data.trackingNumber) {
    await sendShopOrderDispatchedEmail(updated);
  }
  if (parsed.data.status === "delivered") {
    await sendShopOrderDeliveredEmail(updated);
  }
  return Response.json({ ok: true, order: updated });
}
