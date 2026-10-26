import { z } from "zod";
import { APP_NAME } from "@/config/brand";
import { requireAdmin } from "@/lib/adminAuth";
import { resultsEmail, sendEmail } from "@/lib/email";
import { refundOrder } from "@/lib/fulfillment";
import { deliverOrder, regenerateStyle, runQueue } from "@/lib/generation";
import { jsonError, parseBody } from "@/lib/http";
import { appUrl } from "@/lib/runtime";
import { getStore } from "@/lib/store";

const schema = z.object({
  action: z.enum(["approve", "regenerate", "refund", "resend"]),
  styleId: z.string().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) return jsonError("Order not found.", 404);

  if (parsed.data.action === "approve") {
    if (order.status !== "review" && order.status !== "failed") return jsonError("Only orders in review can be approved.");
    await deliverOrder(id);
  }
  if (parsed.data.action === "regenerate") {
    if (!parsed.data.styleId) return jsonError("Choose a style to regenerate.");
    await regenerateStyle(id, parsed.data.styleId);
    await runQueue();
  }
  if (parsed.data.action === "refund") await refundOrder(id);
  if (parsed.data.action === "resend") {
    if (order.status !== "delivered") return jsonError("Send the email after the order is delivered.");
    await sendEmail({
      to: order.email,
      subject: `Your ${APP_NAME} portraits are ready`,
      html: resultsEmail(`${appUrl()}/results/${order.resultsToken}`),
    });
  }
  return Response.json({ ok: true, order: await store.getOrder(id) });
}
