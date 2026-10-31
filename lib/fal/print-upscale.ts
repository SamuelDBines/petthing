import sharp from "sharp";
import { falQueueResultUrl, falQueueStatusUrl, parseFalSubmitBody } from "@/lib/fal/queue-urls";
import { FalProviderError, parseFalErrorDetail } from "@/lib/fal/provider-errors";
import { usdToGbp } from "@/lib/runtime";
import { getStore } from "@/lib/store";

import { FAL_PRINT_UPSCALE_MODEL, FAL_PRINT_UPSCALE_SCALE } from "@/lib/pawtraitry/print-upscale-config";

const FAL_UPSCALE_USD_PER_SECOND = 0.00111;
const FAL_UPSCALE_DEFAULT_USD = 0.02;

export function falPrintUpscaleCostGbp(inferenceSeconds?: number | null) {
  if (typeof inferenceSeconds === "number" && inferenceSeconds > 0) {
    return usdToGbp(inferenceSeconds * FAL_UPSCALE_USD_PER_SECOND);
  }
  const usd = Number(process.env.FAL_UPSCALE_COST_USD || String(FAL_UPSCALE_DEFAULT_USD));
  return usdToGbp(Number.isFinite(usd) ? usd : FAL_UPSCALE_DEFAULT_USD);
}

async function falFetch(url: string, init?: RequestInit) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function downloadUpscaledJpeg(url: string) {
  const file = await fetch(url);
  if (!file.ok) throw new Error("Could not download upscaled image");
  const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const meta = await sharp(jpeg).rotate().metadata();
  return {
    bytes: jpeg,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

function inferenceSecondsFromStatus(status: Record<string, unknown>) {
  const metrics = status.metrics as { inference_time?: number } | undefined;
  if (typeof metrics?.inference_time === "number" && metrics.inference_time > 0) return metrics.inference_time;
  const direct = status.inference_time;
  if (typeof direct === "number" && direct > 0) return direct;
  return null;
}

async function pollFalUpscale(requestId: string, statusUrl: string, responseUrl: string) {
  let inferenceSeconds: number | null = null;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const statusResponse = await falFetch(falQueueStatusUrl(requestId, statusUrl, FAL_PRINT_UPSCALE_MODEL));
    if (!statusResponse.ok) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const status = (await statusResponse.json()) as Record<string, unknown> & { status?: string; error?: string };
    inferenceSeconds = inferenceSecondsFromStatus(status) ?? inferenceSeconds;
    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (status.status === "FAILED" || status.status === "CANCELED") {
      throw new Error(status.error || `fal upscale ${status.status}`);
    }
    const resultResponse = await falFetch(falQueueResultUrl(requestId, responseUrl, FAL_PRINT_UPSCALE_MODEL));
    if (resultResponse.status === 202) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!resultResponse.ok) throw new Error(`fal upscale result failed (${resultResponse.status})`);
    const raw = (await resultResponse.json()) as {
      image?: { url?: string };
      images?: { url?: string }[];
      data?: { image?: { url?: string }; images?: { url?: string }[]; metrics?: { inference_time?: number } };
      metrics?: { inference_time?: number };
    };
    const payload = raw.data ?? raw;
    inferenceSeconds =
      inferenceSecondsFromStatus(payload as Record<string, unknown>) ??
      inferenceSecondsFromStatus(raw as Record<string, unknown>) ??
      inferenceSeconds;
    const url = payload.image?.url ?? payload.images?.[0]?.url;
    if (!url) throw new Error("fal upscale returned no image url");
    const image = await downloadUpscaledJpeg(url);
    return { ...image, inferenceSeconds };
  }
  throw new Error("Timed out waiting for fal upscale");
}

async function upscaleWithSharp(sourceBytes: Buffer) {
  const meta = await sharp(sourceBytes).rotate().metadata();
  const w = meta.width ?? 768;
  const h = meta.height ?? 1024;
  const bytes = await sharp(sourceBytes)
    .rotate()
    .resize(w * FAL_PRINT_UPSCALE_SCALE, h * FAL_PRINT_UPSCALE_SCALE, { kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const out = await sharp(bytes).rotate().metadata();
  return { bytes, width: out.width ?? w * FAL_PRINT_UPSCALE_SCALE, height: out.height ?? h * FAL_PRINT_UPSCALE_SCALE };
}

/** One fal-ai/esrgan 4x jpeg upscale (tile 400). Records spend. Falls back to sharp when FAL_KEY is unset. */
export async function falUpscaleImage(args: { imageUrl: string; sourceBytes: Buffer; storeId: string }) {
  if (!process.env.FAL_KEY?.trim()) {
    return { ...(await upscaleWithSharp(args.sourceBytes)), costGbp: 0 };
  }
  const response = await falFetch(`https://queue.fal.run/${FAL_PRINT_UPSCALE_MODEL}`, {
    method: "POST",
    body: JSON.stringify({
      image_url: args.imageUrl,
      scale: FAL_PRINT_UPSCALE_SCALE,
      output_format: "jpeg",
      tile: 400,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new FalProviderError(response.status, parseFalErrorDetail(detail));
  }
  const body = (await response.json()) as { request_id?: string; status_url?: string; response_url?: string };
  const parsed = parseFalSubmitBody(body);
  const polled = await pollFalUpscale(parsed.requestId, parsed.statusUrl, parsed.responseUrl);
  const costGbp = falPrintUpscaleCostGbp(polled.inferenceSeconds);
  await getStore().addSpend(costGbp, args.storeId);
  return { bytes: polled.bytes, width: polled.width, height: polled.height, costGbp };
}

export async function upscalePortraitForPrint(args: {
  orderId: string;
  sourceAssetId: string;
  sourceBytes: Buffer;
  imageUrl: string;
}) {
  const store = getStore();
  const order = await store.getOrder(args.orderId);
  const cached = order?.productMeta?.printUpscale;
  if (cached?.sourceAssetId === args.sourceAssetId && cached.storagePath) {
    const { readBlob } = await import("@/lib/blobs");
    const blob = await readBlob("results", cached.storagePath);
    if (blob) {
      return {
        bytes: blob.bytes,
        width: cached.width,
        height: cached.height,
        costGbp: cached.costGbp,
        storagePath: cached.storagePath,
        reused: true as const,
      };
    }
  }

  const digital = args.sourceAssetId ? order?.productMeta?.freePreview?.upscaled?.[args.sourceAssetId] : undefined;
  if (digital?.storagePath && !digital.fallback) {
    const { readBlob } = await import("@/lib/blobs");
    const blob = await readBlob("results", digital.storagePath);
    if (blob) {
      return {
        bytes: blob.bytes,
        width: digital.width,
        height: digital.height,
        costGbp: 0,
        storagePath: digital.storagePath,
        reused: true as const,
      };
    }
  }

  const upscaled = await falUpscaleImage({
    imageUrl: args.imageUrl,
    sourceBytes: args.sourceBytes,
    storeId: order?.storeId ?? "pawtraitry",
  });
  const result = { bytes: upscaled.bytes, width: upscaled.width, height: upscaled.height };
  const costGbp = upscaled.costGbp;

  const storagePath = `${args.orderId}/print-upscale/${args.sourceAssetId}.jpg`;
  const { putBlob } = await import("@/lib/blobs");
  await putBlob("results", storagePath, result.bytes, "image/jpeg");
  const printUpscale = {
    sourceAssetId: args.sourceAssetId,
    storagePath,
    width: result.width,
    height: result.height,
    costGbp,
    completedAt: new Date().toISOString(),
  };
  if (order) {
    await store.updateOrder(order.id, {
      generationCostGbp: order.generationCostGbp + costGbp,
      productMeta: { ...order.productMeta, printUpscale },
    });
  }
  return { ...result, costGbp, storagePath, reused: false as const };
}
