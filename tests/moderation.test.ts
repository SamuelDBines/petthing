import assert from "node:assert/strict";
import test from "node:test";
import {
  __clearFalIncidentsForTests,
  recentFalHealthDetailFromMemory,
} from "../lib/fal/provider-errors";
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

test("production without fal fails open for checkout", async () => {
  const prevKey = process.env.FAL_KEY;
  const prevMock = process.env.MOCK_MODERATION;
  const env = process.env as Record<string, string | undefined>;
  const prevEnv = env.NODE_ENV;
  delete process.env.FAL_KEY;
  delete process.env.MOCK_MODERATION;
  delete process.env.ALLOW_MOCK_MODERATION;
  env.NODE_ENV = "production";
  const result = await moderateImage(tinyPng, "image/png");
  assert.equal(result.allowed, true);
  assert.equal(result.failOpen, true);
  process.env.FAL_KEY = prevKey;
  process.env.MOCK_MODERATION = prevMock;
  env.NODE_ENV = prevEnv;
});

test("fal 403 TOP_UP fails open and does not expose provider text", async () => {
  const prevKey = process.env.FAL_KEY;
  const prevFetch = globalThis.fetch;
  __clearFalIncidentsForTests();
  process.env.FAL_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "User is locked. Reason: TOP_UP" }), { status: 403 });

  const result = await moderateImage(tinyPng, "image/png");
  assert.equal(result.allowed, true);
  assert.equal(result.failOpen, true);
  assert.ok(!result.customerMessage.includes("TOP_UP"));
  assert.equal(recentFalHealthDetailFromMemory(), "fal: account locked / out of credit");

  globalThis.fetch = prevFetch;
  process.env.FAL_KEY = prevKey;
  __clearFalIncidentsForTests();
});

test("genuine NSFW probability blocks with customer-safe message", async () => {
  const prevKey = process.env.FAL_KEY;
  const prevFetch = globalThis.fetch;
  process.env.FAL_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ nsfw_probability: 0.99 }), { status: 200 });

  const result = await moderateImage(tinyPng, "image/png");
  assert.equal(result.allowed, false);
  assert.equal(result.blocked, true);
  assert.match(result.customerMessage, /nudity|sexual/i);
  assert.ok(!result.customerMessage.includes("fal"));

  globalThis.fetch = prevFetch;
  process.env.FAL_KEY = prevKey;
});
