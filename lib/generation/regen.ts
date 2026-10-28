import { randomUUID } from "crypto";
import type { Asset, Job } from "@/lib/domain";
import { deleteBlob, putBlob, readBlob } from "@/lib/blobs";
import { watermark } from "@/lib/watermark";
import type { Store } from "@/lib/store";

export function regenJobUpdate(job: Job): Partial<Job> {
  return {
    status: "queued",
    attempts: 0,
    providerRequestId: null,
    providerMeta: null,
    falPaidSubmits: 0,
    regenCount: (job.regenCount ?? 0) + 1,
    lastError: null,
    lockedUntil: null,
    nextRunAt: null,
  };
}

export function slotAssets(assets: Asset[], styleId: string, variantIndex: number) {
  return assets.filter(
    (asset) =>
      asset.styleId === styleId &&
      asset.variantIndex === variantIndex &&
      asset.kind !== "upload",
  );
}

export async function deleteSlotAssets(store: Store, assets: Asset[], styleId: string, variantIndex: number) {
  const doomed = slotAssets(assets, styleId, variantIndex);
  for (const asset of doomed) await deleteBlob(asset.bucket, asset.storagePath);
  if (doomed.length) await store.deleteAssets(doomed.map((asset) => asset.id));
}

export async function clearStaleReplacements(
  store: Store,
  assets: Asset[],
  styleId: string,
  variantIndex: number,
) {
  const doomed = assets.filter(
    (asset) =>
      asset.kind === "result_replacement" &&
      asset.styleId === styleId &&
      asset.variantIndex === variantIndex,
  );
  for (const asset of doomed) await deleteBlob(asset.bucket, asset.storagePath);
  if (doomed.length) await store.deleteAssets(doomed.map((asset) => asset.id));
}

export async function approvePortraitReplacement(
  store: Store,
  orderId: string,
  styleId: string,
  variantIndex: number,
) {
  const assets = await store.listAssets(orderId);
  const replacement = assets.find(
    (asset) =>
      asset.kind === "result_replacement" &&
      asset.styleId === styleId &&
      asset.variantIndex === variantIndex,
  );
  if (!replacement) throw new Error("No replacement portrait is waiting for approval");

  const live = assets.find(
    (asset) => asset.kind === "result" && asset.styleId === styleId && asset.variantIndex === variantIndex,
  );
  const previews = assets.filter(
    (asset) =>
      asset.kind === "preview" &&
      asset.styleId === styleId &&
      asset.variantIndex === variantIndex,
  );
  for (const asset of previews) {
    await deleteBlob(asset.bucket, asset.storagePath);
    await store.deleteAssets([asset.id]);
  }
  if (live) {
    await deleteBlob(live.bucket, live.storagePath);
    await store.deleteAssets([live.id]);
  }

  const extension = replacement.contentType.includes("png") ? "png" : "jpg";
  const storagePath = `${orderId}/results/${styleId}-${variantIndex}.${extension}`;
  const file = await readBlob(replacement.bucket, replacement.storagePath);
  if (!file) throw new Error("Replacement file is missing from storage");
  await putBlob("results", storagePath, file.bytes, replacement.contentType);
  await deleteBlob(replacement.bucket, replacement.storagePath);
  await store.deleteAssets([replacement.id]);

  const resultId = randomUUID();
  await store.addAsset({
    id: resultId,
    orderId,
    kind: "result",
    styleId,
    variantIndex,
    storagePath,
    bucket: "results",
    contentType: replacement.contentType,
    moderation: replacement.moderation,
    createdAt: new Date().toISOString(),
  });

  const preview = await watermark(file.bytes);
  const previewPath = `${orderId}/previews/${resultId}.jpg`;
  await putBlob("results", previewPath, preview, "image/jpeg");
  await store.addAsset({
    id: randomUUID(),
    orderId,
    kind: "preview",
    styleId,
    variantIndex,
    storagePath: previewPath,
    bucket: "results",
    contentType: "image/jpeg",
    moderation: "passed",
    createdAt: new Date().toISOString(),
  });
}
