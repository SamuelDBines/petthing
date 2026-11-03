/**
 * One real fal kontext/multi generation for manual QA.
 * Requires FAL_KEY and a public reference image URL (fal cannot fetch localhost).
 *
 *   FAL_SMOKE_IMAGE_URL=https://yoursite/examples/pet-before.jpg npx tsx scripts/fal-smoke.ts
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { buildPrompt } from "@/config/stylePrompts";
import { getImageProvider } from "@/lib/imageProvider";

const OUT_DIR = path.join(process.cwd(), "tmp", "fal-smoke");

async function pollUntilDone(
  provider: ReturnType<typeof getImageProvider>,
  requestId: string,
  providerMeta: { statusUrl: string; responseUrl: string },
) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await provider.poll(requestId, providerMeta);
    if (result.state === "ready") return result;
    if (result.state === "failed") throw new Error(result.error);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for fal");
}

async function main() {
  const imageUrl = process.env.FAL_SMOKE_IMAGE_URL?.trim();
  if (!process.env.FAL_KEY?.trim()) {
    console.error("Set FAL_KEY");
    process.exit(1);
  }
  if (!imageUrl) {
    console.error(
      "Set FAL_SMOKE_IMAGE_URL to a public https URL (e.g. your staging /examples/pet-before.jpg).",
    );
    process.exit(1);
  }

  const provider = getImageProvider();
  if (provider.id === "placeholder") {
    console.error("IMAGE_PROVIDER must be fal (FAL_KEY set).");
    process.exit(1);
  }

  const { prompt, negative } = buildPrompt({
    styleId: "victorian-portrait",
    subject: "pet",
    variantIndex: 0,
    quality: "standard",
    forFalKontext: true,
  });

  console.log("Submitting fal job…");
  const submitted = await provider.submit({
    prompt,
    negativePrompt: negative,
    imageUrls: [imageUrl],
    quality: "standard",
    seed: 42,
  });

  console.log("request_id:", submitted.requestId);
  const done = await pollUntilDone(provider, submitted.requestId, submitted.providerMeta);
  const image = done.images[0];
  if (!image) throw new Error("No image in response");

  await mkdir(OUT_DIR, { recursive: true });
  const ext = image.contentType.includes("png") ? "png" : "jpg";
  const outPath = path.join(OUT_DIR, `kontext-smoke-${Date.now()}.${ext}`);
  await writeFile(outPath, image.bytes);
  console.log("Saved:", outPath, `(${image.bytes.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
