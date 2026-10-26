import { z } from "zod";
import { requireAdminPost } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { refundShopOrder } from "@/lib/shop/refunds";
import { getStore } from "@/lib/store";

const schema = z.object({
  action: z.enum(["refund_full", "refund_partial"]),
  amountPence: z.number().int().positive().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(schema, await request.json().catch(() => null));
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
