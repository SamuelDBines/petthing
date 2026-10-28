import test from "node:test";
import assert from "node:assert/strict";
import {
  GLOBAL_SECURITY_HEADER_EXCLUDE,
  contentWorkerSecurityHeaders,
  defaultSecurityHeaders,
  headerValue,
  nextHeaderRules,
} from "../lib/next-security-headers";

test("next header rules exclude content-worker from global DENY", () => {
  const rules = nextHeaderRules();
  assert.equal(rules.length, 2);
  assert.match(rules[1]!.source, /api\/admin\/content-worker/);
  assert.equal(rules[0]!.source, "/api/admin/content-worker/:path*");
  assert.equal(headerValue(rules[0]!.headers, "X-Frame-Options"), "SAMEORIGIN");
  assert.equal(headerValue(rules[0]!.headers, "Content-Security-Policy"), "frame-ancestors 'self'");
  assert.equal(headerValue(rules[1]!.headers, "X-Frame-Options"), "DENY");
  assert.match(headerValue(rules[1]!.headers, "Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(GLOBAL_SECURITY_HEADER_EXCLUDE, "/((?!api/admin/content-worker).*)");
});

test("default security headers allow self in frame-src for admin iframe", () => {
  const csp = headerValue(defaultSecurityHeaders(), "Content-Security-Policy") ?? "";
  assert.match(csp, /frame-src 'self'/);
});

test("default security headers allow Meta pixel (fbevents.js and CAPI)", () => {
  const csp = headerValue(defaultSecurityHeaders(), "Content-Security-Policy") ?? "";
  assert.match(csp, /script-src[^;]*https:\/\/connect\.facebook\.net/);
  assert.match(csp, /connect-src[^;]*https:\/\/connect\.facebook\.net/);
  assert.match(csp, /connect-src[^;]*https:\/\/www\.facebook\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/www\.facebook\.com/);
  assert.match(csp, /img-src[^;]*https:\/\/www\.facebook\.com/);
});

test("content worker headers are frameable same-origin only", () => {
  const headers = contentWorkerSecurityHeaders();
  assert.equal(headerValue(headers, "X-Robots-Tag"), undefined);
  assert.equal(headerValue(headers, "X-Frame-Options"), "SAMEORIGIN");
  assert.equal(headerValue(headers, "Content-Security-Policy"), "frame-ancestors 'self'");
});

test("robots tag is applied at request time (not in static next header rules)", () => {
  const prev = process.env.SITE_NOINDEX;
  process.env.SITE_NOINDEX = "true";
  try {
    const rules = nextHeaderRules();
    for (const rule of rules) {
      assert.equal(headerValue(rule.headers, "X-Robots-Tag"), undefined);
    }
  } finally {
    if (prev === undefined) delete process.env.SITE_NOINDEX;
    else process.env.SITE_NOINDEX = prev;
  }
});
