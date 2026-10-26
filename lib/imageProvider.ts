import { imageCostGbp } from "@/lib/runtime";
import { paintPlaceholder } from "@/lib/placeholderImage";

export type GenerateRequest = {
  prompt: string;
  negativePrompt: string;
  imageUrls: string[];
  quality: "standard" | "hd";
  seed: number;
};

export type GeneratedFile = {
  bytes: Buffer;
  contentType: string;
  nsfw: boolean;
};

export type ProviderPoll =
  | { state: "pending" }
  | { state: "failed"; error: string }
  | { state: "ready"; images: GeneratedFile[]; costGbp: number };

export interface ImageProvider {
  readonly id: string;
  submit(input: GenerateRequest): Promise<{ requestId: string }>;
  poll(requestId: string): Promise<ProviderPoll>;
}

const localJobs = new Map<string, GenerateRequest>();

const placeholderProvider: ImageProvider = {
  id: "placeholder",
  async submit(input) {
    const requestId = `local:${crypto.randomUUID()}`;
    localJobs.set(requestId, input);
    return { requestId };
  },
  async poll(requestId) {
    const input = localJobs.get(requestId);
    if (!input) return { state: "failed", error: "Placeholder job expired. It will be retried." };
    localJobs.delete(requestId);
    return {
      state: "ready",
      costGbp: 0,
      images: [
        {
          bytes: paintPlaceholder(input.seed),
          contentType: "image/png",
          nsfw: false,
        },
      ],
    };
  },
};

function modelId() {
  return process.env.FAL_MODEL_ID || "fal-ai/flux-pro/kontext/multi";
}

async function falFetch(url: string, init?: RequestInit) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return response;
}

const falProvider: ImageProvider = {
  id: "fal-kontext-multi",
  async submit(input) {
    if (input.imageUrls.some((url) => url.includes("localhost") || url.includes("127.0.0.1"))) {
      throw new Error("fal.ai cannot fetch photos from localhost. Use Supabase storage so reference URLs are reachable.");
    }
    const response = await falFetch(`https://queue.fal.run/${modelId()}`, {
      method: "POST",
      body: JSON.stringify({
        prompt: input.prompt,
        image_urls: input.imageUrls,
        num_images: 1,
        output_format: input.quality === "hd" ? "png" : "jpeg",
        safety_tolerance: "1",
        aspect_ratio: "3:4",
        guidance_scale: 3.5,
        enhance_prompt: false,
        seed: input.seed,
      }),
    });
    if (!response.ok) {
      throw new Error(`fal queue rejected the job (${response.status}): ${(await response.text()).slice(0, 240)}`);
    }
    const body = (await response.json()) as { request_id?: string };
    if (!body.request_id) throw new Error("fal queue did not return a request id");
    return { requestId: body.request_id };
  },
  async poll(requestId) {
    const statusResponse = await falFetch(`https://queue.fal.run/${modelId()}/requests/${requestId}/status`);
    if (statusResponse.status === 404) return { state: "failed", error: "fal request was not found" };
    if (!statusResponse.ok) {
      return { state: "failed", error: `fal status failed (${statusResponse.status})` };
    }
    const status = (await statusResponse.json()) as { status?: string; error?: string };
    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") return { state: "pending" };
    if (status.status === "FAILED" || status.status === "CANCELED") {
      return { state: "failed", error: status.error || `fal status ${status.status}` };
    }
    const resultResponse = await falFetch(`https://queue.fal.run/${modelId()}/requests/${requestId}`);
    if (resultResponse.status === 202) return { state: "pending" };
    if (!resultResponse.ok) return { state: "failed", error: `fal result failed (${resultResponse.status})` };
    const raw = (await resultResponse.json()) as {
      images?: { url?: string }[];
      has_nsfw_concepts?: boolean[];
      data?: { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] };
    };
    const payload = raw.images ? raw : raw.data;
    const images = payload?.images ?? [];
    const flags = payload?.has_nsfw_concepts ?? [];
    if (!images.length || !images[0]?.url) return { state: "failed", error: "fal returned no image" };
    const downloaded: GeneratedFile[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const url = images[index]?.url;
      if (!url) continue;
      const file = await fetch(url);
      if (!file.ok) return { state: "failed", error: "Could not download the generated image" };
      const contentType = file.headers.get("content-type") || "image/jpeg";
      downloaded.push({
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: contentType.split(";")[0],
        nsfw: Boolean(flags[index]),
      });
    }
    return { state: "ready", images: downloaded, costGbp: imageCostGbp() * downloaded.length };
  },
};

export function getImageProvider(): ImageProvider {
  return process.env.FAL_KEY ? falProvider : placeholderProvider;
}
