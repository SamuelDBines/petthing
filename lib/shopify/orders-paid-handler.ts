import { randomUUID } from "crypto";
import type { Order } from "@/lib/domain";
import { alertAdmin } from "@/lib/email";
import { sniffImage } from "@/lib/http";
import { putBlob } from "@/lib/blobs";
import { moderateImage } from "@/lib/moderation";
import { flagOrderPhotoSafetyReview } from "@/lib/order-photo-review";
import { referralCode } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import { enqueuePlan, scheduleOrderGeneration } from "@/lib/generation";
import { buildInternalOrder, groupPortraitLines, shopifyRef, type ShopifyOrderPayload } from "@/lib/shopify/orders-paid";

export type OrdersPaidDeps = {
  fetchImage?: (url: string) => Promise<Buffer>;
  schedule?: (orderId: string) => void;
  alert?: (subject: string, html: string) => Promise<unknown>;
};

const MAX_PHOTO_BYTES = 20_000_000;

async function defaultFetchImage(url: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Photo download failed (${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("Photo is over 20MB");
  return bytes;
}

function esc(text: string) {
  return text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}

export type OrdersPaidResult = { created: string[]; skipped: string[]; problems: string[] };

export async function handleShopifyOrdersPaid(payload: ShopifyOrderPayload, deps: OrdersPaidDeps = {}): Promise<OrdersPaidResult> {
  const store = getStore();
  const fetchImage = deps.fetchImage ?? defaultFetchImage;
  const schedule = deps.schedule ?? scheduleOrderGeneration;
  const alert = deps.alert ?? ((s: string, h: string) => alertAdmin(s, h, "pawtraitry"));
  const result: OrdersPaidResult = { created: [], skipped: [], problems: [] };

  if (payload.financial_status && payload.financial_status !== "paid") {
    result.skipped.push(`financial_status=${payload.financial_status}`);
    return result;
  }
  const { groups, problems } = groupPortraitLines(payload);
  result.problems.push(...problems);
  const email = (payload.email || payload.contact_email || "").trim();
  if (!email) result.problems.push("Order has no customer email.");

  for (const [index, group] of groups.entries()) {
    if (!email) break;
    const ref = shopifyRef(payload.id, index);
    if (await store.getOrderByCheckoutSession(ref)) {
      result.skipped.push(ref);
      continue;
    }
    if (group.unknownSkus.length) result.problems.push(`Unknown SKUs ${group.unknownSkus.join(", ")} (not printed).`);
    const order: Order = buildInternalOrder({ payload, group, groupIndex: index, referralCode: referralCode("PAW") });
    if (group.physical.length && order.shipping?.countryCode !== "GB") {
      result.problems.push(`${ref}: physical items need a UK address.`);
    }
    let bytes: Buffer;
    try {
      bytes = await fetchImage(group.photoUrl);
    } catch (error) {
      result.problems.push(`${ref}: ${error instanceof Error ? error.message : "photo download failed"}`);
      continue;
    }
    const contentType = sniffImage(bytes);
    if (!contentType) {
      result.problems.push(`${ref}: photo is not a JPEG, PNG or WebP.`);
      continue;
    }
    const moderation = await moderateImage(bytes, contentType, { storeId: "pawtraitry" });
    if (moderation.costGbp) await store.addSpend(moderation.costGbp);
    if (!moderation.allowed) {
      result.problems.push(`${ref}: photo rejected by moderation.`);
      continue;
    }
    await store.createOrder(order);
    if (moderation.failOpen) await flagOrderPhotoSafetyReview(order.id);
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const storagePath = `${order.id}/uploads/${randomUUID()}.${extension}`;
    await putBlob("uploads", storagePath, bytes, contentType);
    await store.addAsset({
      id: randomUUID(),
      orderId: order.id,
      kind: "upload",
      styleId: null,
      variantIndex: null,
      storagePath,
      bucket: "uploads",
      contentType,
      moderation: moderation.skipped ? "skipped" : "passed",
      createdAt: new Date().toISOString(),
    });
    await enqueuePlan(order.id, [{ styleId: group.styleId, count: 1 }]);
    schedule(order.id);
    result.created.push(order.id);
  }

  if (result.problems.length) {
    await alert(
      `Shopify order ${payload.name ?? payload.id} needs attention`,
      `<ul>${result.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p>Refund or fix it in Shopify admin.</p>`,
    );
  }
  return result;
}
