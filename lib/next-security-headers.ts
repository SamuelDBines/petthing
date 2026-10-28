const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");

export const GLOBAL_SECURITY_HEADER_EXCLUDE = "/((?!api/admin/content-worker).*)";

export function defaultSecurityHeaders() {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        `connect-src 'self' https://api.stripe.com https://*.ingest.sentry.io ${posthogHost}`,
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
  ];
}

export function contentWorkerSecurityHeaders() {
  return [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Content-Security-Policy",
      value: "frame-ancestors 'self'",
    },
  ];
}

export function nextHeaderRules() {
  return [
    { source: "/api/admin/content-worker/:path*", headers: contentWorkerSecurityHeaders() },
    { source: GLOBAL_SECURITY_HEADER_EXCLUDE, headers: defaultSecurityHeaders() },
  ];
}

export function headerValue(headers: { key: string; value: string }[], key: string) {
  return headers.find((row) => row.key.toLowerCase() === key.toLowerCase())?.value;
}
