import test from "node:test";
import assert from "node:assert/strict";
import { resolveClientIpFromHeaders } from "../lib/runtime/client-ip";

test("resolveClientIpFromHeaders skips trusted proxy hops", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.106.0.4",
  });
  assert.equal(resolveClientIpFromHeaders(headers), "203.0.113.10");
});

test("resolveClientIpFromHeaders uses x-real-ip after trusted chain", () => {
  const headers = new Headers({
    "x-forwarded-for": "10.106.0.4",
    "x-real-ip": "198.51.100.2",
  });
  assert.equal(resolveClientIpFromHeaders(headers), "198.51.100.2");
});
