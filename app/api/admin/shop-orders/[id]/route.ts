import { z } from "zod";
import { requireAdminPost } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { refundShopOrder } from "@/lib/shop/refunds";
import { sendShopOrderDispatchedEmail } from "@/lib/shop/emails";
import { getStore } from "@/lib/store";

const postSchema = z.object({
  action: z.enum(["refund_full", "refund_partial"]),
  amountPence: z.number().int().positive().optional(),
});

const patchSchema = z.object({
  trackingNumber: z.string().min(3).optional(),
  status: z.enum(["shipped", "delivered", "submitted_to_supplier"]).optional(),
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
    } else {
      if (!parsed.data.amountPence) return jsonError("amountPence required for partial refund.");
      await refundShopOrder(id, parsed.data.amountPence);
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Refund failed", 400);
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
  const updated = await store.updateShopOrder(id, patch);
  if (parsed.data.status === "shipped" || parsed.data.trackingNumber) {
    await sendShopOrderDispatchedEmail(updated);
  }
  return Response.json({ ok: true, order: updated });
}
