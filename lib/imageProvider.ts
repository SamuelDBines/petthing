import {
  FalProviderError,
  isFalProviderHttpStatus,
  parseFalErrorDetail,
  recordFalProviderIncident,
} from "@/lib/fal/provider-errors";
import { validateGeneratedImage } from "@/lib/fal/image-output";
import {
  falQueueResultUrl,
  falQueueStatusUrl,
  falQueueSubmitUrl,
  parseFalSubmitBody,
} from "@/lib/fal/queue-urls";
import { imageCostGbp } from "@/lib/runtime";
import { paintPlaceholder } from "@/lib/placeholderImage";

export type GenerateRequest = {
  prompt: string;
  negativePrompt: string;
  imageUrls: string[];
  quality: "standard" | "hd";
  seed: number;
};

export type FalProviderMeta = {
  statusUrl: string;
  responseUrl: string;
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

export type ProviderSubmitResult = {
  requestId: string;
  providerMeta: FalProviderMeta;
};

export interface ImageProvider {
  readonly id: string;
  submit(input: GenerateRequest): Promise<ProviderSubmitResult>;
  poll(requestId: string, providerMeta?: FalProviderMeta | null): Promise<ProviderPoll>;
}

const localJobs = new Map<string, GenerateRequest>();

const placeholderProvider: ImageProvider = {
  id: "placeholder",
  async submit(input) {
    const requestId = `local:${crypto.randomUUID()}`;
    localJobs.set(requestId, input);
    return {
      requestId,
      providerMeta: { statusUrl: "", responseUrl: "" },
    };
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

function modelPath() {
  return process.env.FAL_MODEL_ID || "fal-ai/flux-pro/kontext/multi";
}

function safetyTolerance() {
  const raw = process.env.FAL_SAFETY_TOLERANCE?.trim();
  return raw || "2";
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
  if (!response.ok && isFalProviderHttpStatus(response.status)) {
    const detail = parseFalErrorDetail(await response.text());
    recordFalProviderIncident("generation", response.status, detail);
    throw new FalProviderError(response.status, detail);
  }
  return response;
}

const falProvider: ImageProvider = {
  id: "fal-kontext-multi",
  async submit(input) {
    if (input.imageUrls.some((url) => url.includes("localhost") || url.includes("127.0.0.1"))) {
      throw new Error("fal.ai cannot fetch photos from localhost. Use Supabase storage so reference URLs are reachable.");
    }
    const response = await falFetch(falQueueSubmitUrl(modelPath()), {
      method: "POST",
      body: JSON.stringify({
        prompt: input.prompt,
        image_urls: input.imageUrls,
        num_images: 1,
        output_format: input.quality === "hd" ? "png" : "jpeg",
        safety_tolerance: safetyTolerance(),
        aspect_ratio: "3:4",
        guidance_scale: 3.5,
        enhance_prompt: false,
        seed: input.seed,
      }),
    });
    if (!response.ok) {
      const detail = parseFalErrorDetail(await response.text());
      throw new Error(`fal queue rejected the job (${response.status}): ${detail.slice(0, 240)}`);
    }
    const body = (await response.json()) as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    const parsed = parseFalSubmitBody(body);
    return {
      requestId: parsed.requestId,
      providerMeta: { statusUrl: parsed.statusUrl, responseUrl: parsed.responseUrl },
    };
  },
  async poll(requestId, providerMeta) {
    const statusUrl = falQueueStatusUrl(requestId, providerMeta?.statusUrl, modelPath());
    const statusResponse = await falFetch(statusUrl);
    if (statusResponse.status === 404) return { state: "failed", error: "fal request was not found" };
    if (!statusResponse.ok) {
      if (isFalProviderHttpStatus(statusResponse.status)) {
        const detail = parseFalErrorDetail(await statusResponse.text());
        recordFalProviderIncident("generation", statusResponse.status, detail);
        return { state: "pending" };
      }
      return { state: "failed", error: `fal status failed (${statusResponse.status})` };
    }
    const status = (await statusResponse.json()) as { status?: string; error?: string };
    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") return { state: "pending" };
    if (status.status === "FAILED" || status.status === "CANCELED") {
      return { state: "failed", error: status.error || `fal status ${status.status}` };
    }
    const resultUrl = falQueueResultUrl(requestId, providerMeta?.responseUrl, modelPath());
    const resultResponse = await falFetch(resultUrl);
    if (resultResponse.status === 202) return { state: "pending" };
    if (!resultResponse.ok) {
      if (isFalProviderHttpStatus(resultResponse.status)) {
        const detail = parseFalErrorDetail(await resultResponse.text());
        recordFalProviderIncident("generation", resultResponse.status, detail);
        return { state: "pending" };
      }
      return { state: "failed", error: `fal result failed (${resultResponse.status})` };
    }
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
      const bytes = Buffer.from(await file.arrayBuffer());
      await validateGeneratedImage(bytes, Boolean(flags[index]));
      downloaded.push({
        bytes,
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
