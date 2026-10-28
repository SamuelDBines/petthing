import sharp from "sharp";

export class GenerationOutputRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationOutputRetryError";
  }
}

export function isGenerationOutputRetryError(error: unknown) {
  return error instanceof GenerationOutputRetryError;
}

/** fal safety filter often returns near-black frames. */
export async function isMostlyBlackImage(bytes: Buffer) {
  const { channels } = await sharp(bytes).stats();
  const means = channels.slice(0, 3).map((c) => c.mean);
  if (!means.length) return false;
  const avg = means.reduce((a, b) => a + b, 0) / means.length;
  return avg < 12;
}

export async function assertPortraitAspectRatio(bytes: Buffer) {
  const meta = await sharp(bytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return;
  if (width >= height) {
    throw new GenerationOutputRetryError(
      `Expected portrait output (height > width), got ${width}x${height}`,
    );
  }
  const ratio = height / width;
  if (ratio < 1.2 || ratio > 1.5) {
    throw new GenerationOutputRetryError(
      `Expected ~3:4 portrait aspect, got ${width}x${height}`,
    );
  }
}

export async function validateGeneratedImage(bytes: Buffer, nsfwFlag: boolean) {
  if (nsfwFlag) {
    throw new GenerationOutputRetryError("fal flagged has_nsfw_concepts on output");
  }
  if (await isMostlyBlackImage(bytes)) {
    throw new GenerationOutputRetryError("fal returned a black safety-filtered frame");
  }
  await assertPortraitAspectRatio(bytes);
}
