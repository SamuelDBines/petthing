import {
  CUSTOMER_MODERATION_RETRY,
  CUSTOMER_NSFW_MESSAGE,
  isFalProviderHttpStatus,
  parseFalErrorDetail,
  recordFalProviderIncident,
} from "@/lib/fal/provider-errors";
import { usdToGbp } from "@/lib/runtime";

const THRESHOLD = 0.45;

function mockModerationEnabled() {
  return process.env.MOCK_MODERATION === "true" || process.env.ALLOW_MOCK_MODERATION === "true";
}

export type ModerationResult = {
  /** May upload / continue checkout when true (includes fail-open provider errors). */
  allowed: boolean;
  /** Genuine NSFW verdict — block checkout. */
  blocked: boolean;
  /** Provider/account outage — allow with manual photo review. */
  failOpen: boolean;
  customerMessage: string;
  costGbp: number;
  skipped: boolean;
};

function failOpenResult(): ModerationResult {
  return {
    allowed: true,
    blocked: false,
    failOpen: true,
    customerMessage: CUSTOMER_MODERATION_RETRY,
    costGbp: 0,
    skipped: true,
  };
}

export async function moderateImage(bytes: Buffer, contentType: string): Promise<ModerationResult> {
  const key = process.env.FAL_KEY;
  if (!key) {
    if (mockModerationEnabled() || process.env.NODE_ENV !== "production") {
      return {
        allowed: true,
        blocked: false,
        failOpen: false,
        customerMessage: "",
        costGbp: 0,
        skipped: true,
      };
    }
    return failOpenResult();
  }

  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;
  const response = await fetch("https://fal.run/fal-ai/imageutils/nsfw", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image_url: dataUrl }),
  });
  if (!response.ok) {
    const detail = parseFalErrorDetail(await response.text());
    recordFalProviderIncident("nsfw", response.status, detail);
    if (isFalProviderHttpStatus(response.status)) {
      return failOpenResult();
    }
    return {
      allowed: false,
      blocked: true,
      failOpen: false,
      customerMessage: CUSTOMER_MODERATION_RETRY,
      costGbp: 0,
      skipped: false,
    };
  }
  const body = (await response.json()) as { nsfw_probability?: number };
  const probability = Number(body.nsfw_probability ?? 0);
  const costGbp = usdToGbp(0.001);
  if (probability >= THRESHOLD) {
    return {
      allowed: false,
      blocked: true,
      failOpen: false,
      customerMessage: CUSTOMER_NSFW_MESSAGE,
      costGbp,
      skipped: false,
    };
  }
  return {
    allowed: true,
    blocked: false,
    failOpen: false,
    customerMessage: "",
    costGbp,
    skipped: false,
  };
}
