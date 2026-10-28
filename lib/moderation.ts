import { isStoreLive } from "@/lib/go-live/live-stores";
import {
  CUSTOMER_MODERATION_RETRY,
  CUSTOMER_NSFW_MESSAGE,
  isFalProviderHttpStatus,
  parseFalErrorDetail,
  recordFalProviderIncident,
} from "@/lib/fal/provider-errors";
import { isFalCreditExhaustedHttp } from "@/lib/fal/credit-exhaustion";
import { markFalCreditExhausted } from "@/lib/fal/credit-ops";
import { usdToGbp } from "@/lib/runtime";

const THRESHOLD = 0.45;

function mockModerationEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.MOCK_MODERATION === "true" || env.ALLOW_MOCK_MODERATION === "true";
}

export type ModerationContext = {
  storeId?: string;
};

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

/** NSFW screening via fal.ai `fal-ai/imageutils/nsfw` (requires FAL_KEY). */
export async function moderateImage(
  bytes: Buffer,
  contentType: string,
  context: ModerationContext = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<ModerationResult> {
  if (context.storeId && isStoreLive(context.storeId, env) && mockModerationEnabled(env)) {
    throw new Error("MOCK_MODERATION cannot be enabled for stores listed in LIVE_STORES.");
  }

  const key = env.FAL_KEY?.trim();
  if (!key) {
    if (context.storeId && isStoreLive(context.storeId, env)) {
      return {
        allowed: false,
        blocked: true,
        failOpen: false,
        customerMessage: CUSTOMER_MODERATION_RETRY,
        costGbp: 0,
        skipped: false,
      };
    }
    if (mockModerationEnabled(env) || env.NODE_ENV !== "production") {
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
    if (isFalCreditExhaustedHttp(response.status, detail)) {
      void markFalCreditExhausted(detail);
      return failOpenResult();
    }
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

export function moderationUsesMock(env: NodeJS.ProcessEnv = process.env) {
  return mockModerationEnabled(env);
}
