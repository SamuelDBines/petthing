import { z } from "zod";
import { requireAdminPost } from "@/lib/adminAuth";
import { resultsEmail, sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { OrderAlreadyRefundedError, refundOrder } from "@/lib/fulfillment";
import {
  approvePortraitReplacement,
  deliverOrder,
  regenerateMissingPortraits,
  regeneratePortraitVariant,
  regenerateStyle,
  scheduleOrderGeneration,
  runQueue,
} from "@/lib/generation";
import { countResultImages, orderHasFullPortraitSet } from "@/lib/generation/progress";
import { getTier } from "@/config/pricing";
import { loadStoreConfig } from "@/lib/tenant/context";
import { submitJinglefoldPhysicalOrder } from "@/lib/jinglefold/fulfillment";
import { withTransientRetries } from "@/lib/transientErrors";
import { jsonError, parseBody } from "@/lib/http";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";
import { getStore } from "@/lib/store";

const schema = z.object({
  action: z.enum([
    "approve",
    "regenerate",
    "regenerate_variant",
    "regenerate_missing",
    "approve_replacement",
    "refund",
    "resend",
    "resubmit_partner",
  ]),
  styleId: z.string().optional(),
  variantIndex: z.number().int().min(0).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) return jsonError("Order not found.", 404);

  if (parsed.data.action === "approve") {
    if (order.status !== "review" && order.status !== "failed") return jsonError("Only orders in review can be approved.");
    const config = await loadStoreConfig(order.storeId);
    const tier = getTier(order.tierId, config.catalog.tiers);
    const jobs = await store.listJobs(id);
    const assets = await store.listAssets(id);
    if (!orderHasFullPortraitSet(tier, jobs, assets)) {
      const generated = countResultImages(assets);
      return jsonError(`Cannot approve: only ${generated} of ${tier.imageCount} portraits exist.`, 400);
    }
    try {
      await deliverOrder(id);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Delivery failed", 400);
    }
  }
  if (parsed.data.action === "approve_replacement") {
    if (!parsed.data.styleId) return jsonError("Choose a style.");
    if (parsed.data.variantIndex === undefined) return jsonError("Choose a variant index.");
    try {
      await approvePortraitReplacement(store, id, parsed.data.styleId, parsed.data.variantIndex);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Approve failed", 400);
    }
  }
  if (parsed.data.action === "regenerate_missing") {
    try {
      await regenerateMissingPortraits(id);
      await runQueue();
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Regenerate failed", 400);
    }
  }
  if (parsed.data.action === "regenerate") {
    if (!parsed.data.styleId) return jsonError("Choose a style to regenerate.");
    await regenerateStyle(id, parsed.data.styleId);
    scheduleOrderGeneration(id);
  }
  if (parsed.data.action === "regenerate_variant") {
    if (!parsed.data.styleId) return jsonError("Choose a style to regenerate.");
    if (parsed.data.variantIndex === undefined) return jsonError("Choose a variant index (0 = first image).");
    try {
      await regeneratePortraitVariant(id, parsed.data.styleId, parsed.data.variantIndex);
      scheduleOrderGeneration(id);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Regenerate failed", 400);
    }
  }
  if (parsed.data.action === "refund") {
    if (order.status === "refunded") return jsonError("Order is already refunded.", 409);
    try {
      await refundOrder(id);
    } catch (error) {
      if (error instanceof OrderAlreadyRefundedError) return jsonError("Order is already refunded.", 409);
      console.error(`[admin] refund failed for ${id}`, error);
      return jsonError(error instanceof Error ? error.message : "Refund failed", 400);
    }
  }
  if (parsed.data.action === "resubmit_partner") {
    if (!order.productMeta?.personalised) return jsonError("Not a personalised physical order.");
    try {
      await withTransientRetries(() => submitJinglefoldPhysicalOrder(order));
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Partner submit failed", 400);
    }
  }
  if (parsed.data.action === "resend") {
    if (order.status !== "delivered") return jsonError("Send the email after the order is delivered.");
    const config = await loadStoreConfig(order.storeId);
    const origin = storeCanonicalOrigin(order.storeId, config.brand, config.domains);
    await sendEmail(
      withEmailDelivery(orderEmailDelivery(order), {
        to: order.email,
        subject: `Your ${config.brand.appName} portraits are ready`,
        html: resultsEmail(`${origin}/results/${order.resultsToken}`),
        storeId: order.storeId,
      }),
    );
  }
  return Response.json({ ok: true, order: await store.getOrder(id) });
}
