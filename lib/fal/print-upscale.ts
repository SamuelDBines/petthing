import sharp from "sharp";
import { falQueueResultUrl, falQueueStatusUrl, parseFalSubmitBody } from "@/lib/fal/queue-urls";
import { usdToGbp } from "@/lib/runtime";
import { getStore } from "@/lib/store";

import { FAL_PRINT_UPSCALE_MODEL, FAL_PRINT_UPSCALE_SCALE } from "@/lib/pawtraitry/print-upscale-config";
export function falPrintUpscaleCostGbp() {
  const usd = Number(process.env.FAL_UPSCALE_COST_USD || "0.006");
  return usdToGbp(Number.isFinite(usd) ? usd : 0.006);
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

async function pollFalUpscale(requestId: string, statusUrl: string, responseUrl: string) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const statusResponse = await falFetch(falQueueStatusUrl(requestId, statusUrl, FAL_PRINT_UPSCALE_MODEL));
    if (!statusResponse.ok) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const status = (await statusResponse.json()) as { status?: string; error?: string };
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
      data?: { image?: { url?: string }; images?: { url?: string }[] };
    };
    const payload = raw.data ?? raw;
    const url = payload.image?.url ?? payload.images?.[0]?.url;
    if (!url) throw new Error("fal upscale returned no image url");
    const file = await fetch(url);
    if (!file.ok) throw new Error("Could not download upscaled image");
    const bytes = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(bytes).rotate().metadata();
    return {
      bytes,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
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
    .jpeg({ quality: 92 })
    .toBuffer();
  const out = await sharp(bytes).rotate().metadata();
  return { bytes, width: out.width ?? w * FAL_PRINT_UPSCALE_SCALE, height: out.height ?? h * FAL_PRINT_UPSCALE_SCALE };
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

  let result: { bytes: Buffer; width: number; height: number };
  let costGbp = 0;
  if (process.env.FAL_KEY?.trim()) {
    const response = await falFetch(`https://queue.fal.run/${FAL_PRINT_UPSCALE_MODEL}`, {
      method: "POST",
      body: JSON.stringify({
        image_url: args.imageUrl,
        scale: FAL_PRINT_UPSCALE_SCALE,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`fal upscale rejected (${response.status}): ${detail.slice(0, 200)}`);
    }
    const body = (await response.json()) as { request_id?: string; status_url?: string; response_url?: string };
    const parsed = parseFalSubmitBody(body);
    result = await pollFalUpscale(parsed.requestId, parsed.statusUrl, parsed.responseUrl);
    costGbp = falPrintUpscaleCostGbp();
    await store.addSpend(costGbp, order?.storeId ?? "pawtraitry");
  } else {
    result = await upscaleWithSharp(args.sourceBytes);
  }

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
