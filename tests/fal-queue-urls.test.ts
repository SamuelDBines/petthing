import assert from "node:assert/strict";
import test from "node:test";
import {
  falQueueBaseId,
  falQueueResultUrl,
  falQueueStatusUrl,
  parseFalSubmitBody,
} from "../lib/fal/queue-urls";

test("falQueueBaseId strips kontext subpath", () => {
  assert.equal(falQueueBaseId("fal-ai/flux-pro/kontext/multi"), "fal-ai/flux-pro");
});

test("status and result URLs prefer submit response URLs", () => {
  const status = "https://queue.fal.run/fal-ai/flux-pro/requests/abc/status";
  const response = "https://queue.fal.run/fal-ai/flux-pro/requests/abc";
  assert.equal(falQueueStatusUrl("abc", status), status);
  assert.equal(falQueueResultUrl("abc", response), response);
});

test("status and result URLs fall back to base app id", () => {
  assert.equal(
    falQueueStatusUrl("req-1", null, "fal-ai/flux-pro/kontext/multi"),
    "https://queue.fal.run/fal-ai/flux-pro/requests/req-1/status",
  );
  assert.equal(
    falQueueResultUrl("req-1", null, "fal-ai/flux-pro/kontext/multi"),
    "https://queue.fal.run/fal-ai/flux-pro/requests/req-1",
  );
});

test("parseFalSubmitBody reads queue fields", () => {
  const parsed = parseFalSubmitBody({
    request_id: "r1",
    status_url: "https://queue.fal.run/fal-ai/flux-pro/requests/r1/status",
    response_url: "https://queue.fal.run/fal-ai/flux-pro/requests/r1",
  });
  assert.equal(parsed.requestId, "r1");
  assert.equal(parsed.statusUrl, "https://queue.fal.run/fal-ai/flux-pro/requests/r1/status");
});
