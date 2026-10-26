import assert from "node:assert/strict";
import test from "node:test";
import { moderateImage } from "../lib/moderation";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("mock moderation allows uploads when MOCK_MODERATION is set", async () => {
  const prevKey = process.env.FAL_KEY;
  const prevMock = process.env.MOCK_MODERATION;
  const env = process.env as Record<string, string | undefined>;
  const prevEnv = env.NODE_ENV;
  delete process.env.FAL_KEY;
  process.env.MOCK_MODERATION = "true";
  env.NODE_ENV = "production";
  const result = await moderateImage(tinyPng, "image/png");
  assert.equal(result.allowed, true);
  assert.equal(result.skipped, true);
  process.env.FAL_KEY = prevKey;
  process.env.MOCK_MODERATION = prevMock;
  env.NODE_ENV = prevEnv;
});

test("production without fal or mock flag blocks uploads", async () => {
  const prevKey = process.env.FAL_KEY;
  const prevMock = process.env.MOCK_MODERATION;
  const env = process.env as Record<string, string | undefined>;
  const prevEnv = env.NODE_ENV;
  delete process.env.FAL_KEY;
  delete process.env.MOCK_MODERATION;
  delete process.env.ALLOW_MOCK_MODERATION;
  env.NODE_ENV = "production";
  const result = await moderateImage(tinyPng, "image/png");
  assert.equal(result.allowed, false);
  process.env.FAL_KEY = prevKey;
  process.env.MOCK_MODERATION = prevMock;
  env.NODE_ENV = prevEnv;
});
