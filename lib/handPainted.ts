import { randomUUID } from "crypto";
import { HAND_PAINTED_DELIVERY_DAYS, isHandPaintedTierId, type HandPaintedStatus } from "@/config/paintings";
import type { Order } from "@/lib/domain";
import { signedBlobUrl } from "@/lib/blobs";
import { alertAdmin, sendEmail } from "@/lib/email";
import { getStore } from "@/lib/store";

export function handPaintedSizeLabel(tierId: string) {
  if (tierId === "hand_painted_12x16") return "12×16 inch";
  if (tierId === "hand_painted_16x20") return "16×20 inch";
  return tierId;
}

export function buildSupplierEmailDraft(args: {
  order: Order;
  photoUrl: string;
  sizeLabel: string;
  notes: string;
  brandName: string;
}) {
  return [
    `Subject: ArtInBulk hand-painted order. ${args.order.id.slice(0, 8)}`,
    "",
    "Hi ArtInBulk team,",
    "",
    "Please quote and schedule the following hand-painted pet portrait (paid on our site. Do not start until we confirm):",
    "",
    `Customer email: ${args.order.email}`,
    `Canvas size: ${args.sizeLabel}`,
    `Reference photos: ${args.photoUrl}`,
    `Style notes: ${args.notes || "(none)"}`,
    `Internal order id: ${args.order.id}`,
    "",
    `Delivery expectation we gave the customer: ${HAND_PAINTED_DELIVERY_DAYS.min}–${HAND_PAINTED_DELIVERY_DAYS.max} business days.`,
    "",
    "Thanks,",
    args.brandName,
  ].join("\n");
}

export async function createHandPaintedWorkflow(order: Order, brandName: string) {
  if (!isHandPaintedTierId(order.tierId)) return;
  const store = getStore();
  const uploads = (await store.listAssets(order.id)).filter((a) => a.kind === "upload");
  const photoUrl = uploads[0]
    ? await signedBlobUrl(uploads[0].bucket, uploads[0].storagePath, 60 * 60 * 48)
    : "(no upload yet)";
  const sizeLabel = handPaintedSizeLabel(order.tierId);
  const draft = buildSupplierEmailDraft({
    order,
    photoUrl,
    sizeLabel,
    notes: order.cardNames,
    brandName,
  });
  const proofToken = randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  await store.upsertHandPaintedOrder({
    orderId: order.id,
    storeId: order.storeId,
    status: "awaiting_admin",
    sizeLabel,
    customerNotes: order.cardNames,
    supplierEmailDraft: draft,
    proofToken,
    proofAssetUrl: null,
    trackingNumber: null,
    createdAt: now,
    updatedAt: now,
  });

  const supplierTo = process.env.ARTINBULK_ORDERS_EMAIL?.trim();
  if (supplierTo) {
    await sendEmail({
      to: supplierTo,
      subject: `Hand-painted order ${order.id.slice(0, 8)}. ${brandName}`,
      html: `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${draft}</pre>`,
    });
  } else {
    await alertAdmin(
      "Hand-painted order awaiting supplier email",
      `<p>Set ARTINBULK_ORDERS_EMAIL to automate supplier hand-off.</p><pre>${draft}</pre>`,
      order.storeId,
    );
  }
}

export type HandPaintedOrderRow = {
  orderId: string;
  storeId: string;
  status: HandPaintedStatus;
  sizeLabel: string;
  customerNotes: string;
  supplierEmailDraft: string;
  proofToken: string;
  proofAssetUrl: string | null;
  trackingNumber: string | null;
  updatedAt: string;
  createdAt: string;
};
