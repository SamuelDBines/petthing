import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  GenerationOutputRetryError,
  isMostlyBlackImage,
  validateGeneratedImage,
} from "../lib/fal/image-output";

test("isMostlyBlackImage detects near-black frames", async () => {
  const black = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .jpeg()
    .toBuffer();
  assert.equal(await isMostlyBlackImage(black), true);

  const white = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 240, g: 240, b: 240 } },
  })
    .jpeg()
    .toBuffer();
  assert.equal(await isMostlyBlackImage(white), false);
});

test("validateGeneratedImage retries on nsfw flag and black frame", async () => {
  const portrait = await sharp({
    create: { width: 768, height: 1024, channels: 3, background: { r: 200, g: 180, b: 160 } },
  })
    .jpeg()
    .toBuffer();

  await validateGeneratedImage(portrait, false);

  await assert.rejects(
    () => validateGeneratedImage(portrait, true),
    (error: unknown) => error instanceof GenerationOutputRetryError,
  );

  const black = await sharp({
    create: { width: 768, height: 1024, channels: 3, background: { r: 2, g: 2, b: 2 } },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    () => validateGeneratedImage(black, false),
    (error: unknown) => error instanceof GenerationOutputRetryError,
  );
});
