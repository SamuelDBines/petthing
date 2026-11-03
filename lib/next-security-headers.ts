const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");

export const GLOBAL_SECURITY_HEADER_EXCLUDE = "/((?!api/admin/content-worker).*)";

export type NextHeaderRule = { source: string; headers: { key: string; value: string }[] };

export type NextHeaderOptions = {
  siteNoindex?: boolean;
};

export function siteNoindexEnabled(options?: NextHeaderOptions) {
  if (options?.siteNoindex != null) return options.siteNoindex;
  const raw = process.env.SITE_NOINDEX?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function optionalGlobalHeaders(_options?: NextHeaderOptions) {
  // X-Robots-Tag and per-store indexing are set at request time in middleware + metadata.
  return [] as { key: string; value: string }[];
}

export function mergeHeaderSets(...groups: { key: string; value: string }[][]) {
  return groups.flat();
}

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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect.facebook.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https: https://www.facebook.com",
        "worker-src 'self' blob:",
        "font-src 'self' data:",
        `connect-src 'self' https://api.stripe.com https://*.ingest.sentry.io ${posthogHost} https://connect.facebook.net https://www.facebook.com`,
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.facebook.com",
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

export function nextHeaderRules(options?: NextHeaderOptions): NextHeaderRule[] {
  const extras = optionalGlobalHeaders(options);
  return [
    {
      source: "/api/admin/content-worker/:path*",
      headers: mergeHeaderSets(contentWorkerSecurityHeaders(), extras),
    },
    {
      source: GLOBAL_SECURITY_HEADER_EXCLUDE,
      headers: mergeHeaderSets(defaultSecurityHeaders(), extras),
    },
  ];
}

export function headerValue(headers: { key: string; value: string }[], key: string) {
  return headers.find((row) => row.key.toLowerCase() === key.toLowerCase())?.value;
}
