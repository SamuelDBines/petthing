import { randomUUID } from "crypto";
import { z } from "zod";
import { jsonError, parseBody, sniffImage } from "@/lib/http";
import { putBlob } from "@/lib/blobs";
import { moderateImage } from "@/lib/moderation";
import { clientIp, hashIp } from "@/lib/runtime";
import { getStore } from "@/lib/store";

const fields = z.object({
  orderId: z.string().uuid(),
  uploadToken: z.string().min(10),
});

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Upload a photo.");
  const parsed = parseBody(fields, { orderId: form.get("orderId"), uploadToken: form.get("uploadToken") });
  if (!parsed.ok) return parsed.response;
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a photo.");
  if (file.size > 8_000_000) return jsonError("That photo is over 8MB. The form will compress it if you use the page.");

  const store = getStore();
  const ipHash = hashIp(clientIp(request));
  const limit = await store.hitRateLimit(`upload:${ipHash}`, 40, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many uploads from this connection. Try again in an hour.", 429);

  const order = await store.getOrderByUploadToken(parsed.data.orderId, parsed.data.uploadToken);
  if (!order || order.status !== "pending_payment") return jsonError("This order is not accepting photos.", 403);
  const existing = (await store.listAssets(order.id)).filter((asset) => asset.kind === "upload");
  if (existing.length >= 6) return jsonError("You can upload up to 6 photos.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImage(bytes);
  if (!contentType) return jsonError("Use a JPEG, PNG, or WebP photo. HEIC is converted in the browser.");
  const moderation = await moderateImage(bytes, contentType);
  if (moderation.costGbp) await store.addSpend(moderation.costGbp);
  if (!moderation.allowed) return jsonError(moderation.reason, 422);

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
  return Response.json({ ok: true, count: existing.length + 1 });
}
