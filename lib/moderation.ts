import { usdToGbp } from "@/lib/runtime";

const THRESHOLD = 0.45;

function mockModerationEnabled() {
  return process.env.MOCK_MODERATION === "true" || process.env.ALLOW_MOCK_MODERATION === "true";
}

export async function moderateImage(bytes: Buffer, contentType: string) {
  const key = process.env.FAL_KEY;
  if (!key) {
    if (mockModerationEnabled() || process.env.NODE_ENV !== "production") {
      return { allowed: true, reason: "moderation skipped (mock)", costGbp: 0, skipped: true };
    }
    return { allowed: false, reason: "Image moderation is not configured", costGbp: 0, skipped: false };
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
    const detail = await response.text();
    return { allowed: false, reason: `Moderation failed (${response.status}): ${detail.slice(0, 180)}`, costGbp: 0, skipped: false };
  }
  const body = (await response.json()) as { nsfw_probability?: number };
  const probability = Number(body.nsfw_probability ?? 0);
  const costGbp = usdToGbp(0.001);
  if (probability >= THRESHOLD) {
    return {
      allowed: false,
      reason: "That photo looks like it includes nudity or sexual content. Please upload a different one.",
      costGbp,
      skipped: false,
    };
  }
  return { allowed: true, reason: "", costGbp, skipped: false };
}
