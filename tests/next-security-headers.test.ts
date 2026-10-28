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

test("content worker headers are frameable same-origin only", () => {
  const headers = contentWorkerSecurityHeaders();
  assert.equal(headerValue(headers, "X-Robots-Tag"), undefined);
  assert.equal(headerValue(headers, "X-Frame-Options"), "SAMEORIGIN");
  assert.equal(headerValue(headers, "Content-Security-Policy"), "frame-ancestors 'self'");
});

test("SITE_NOINDEX adds X-Robots-Tag on all header rules", () => {
  const prev = process.env.SITE_NOINDEX;
  process.env.SITE_NOINDEX = "true";
  try {
    const rules = nextHeaderRules();
    assert.equal(rules.length, 2);
    for (const rule of rules) {
      assert.equal(headerValue(rule.headers, "X-Robots-Tag"), "noindex, nofollow");
    }
    assert.equal(nextHeaderRules({ siteNoindex: false }).every((rule) => !headerValue(rule.headers, "X-Robots-Tag")), true);
  } finally {
    if (prev === undefined) delete process.env.SITE_NOINDEX;
    else process.env.SITE_NOINDEX = prev;
  }
});
