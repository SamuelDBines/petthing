import JSZip from "jszip";
import { readBlob } from "@/lib/blobs";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const store = getStore();
  const order = await store.getOrderByToken(token);
  if (!order || order.status !== "delivered" || order.resultsDeletedAt) return jsonError("That gallery is not available.", 404);
  const assets = (await store.listAssets(order.id)).filter((asset) => asset.kind === "result");
  const zip = new JSZip();
  for (const asset of assets) {
    const file = await readBlob(asset.bucket, asset.storagePath);
    if (!file) continue;
    const extension = asset.contentType.includes("png") ? "png" : "jpg";
    zip.file(`${asset.styleId ?? "portrait"}-${asset.variantIndex ?? 0}.${extension}`, file.bytes);
  }
  const archive = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="portraits.zip"`,
    },
  });
}
