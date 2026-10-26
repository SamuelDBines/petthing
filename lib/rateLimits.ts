function readLimit(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Per-IP limits (see env vars). Set high values in E2E / load testing. */
export function rateLimits() {
  return {
    ordersPerHour: readLimit("RATE_LIMIT_ORDERS_PER_HOUR", 12),
    checkoutPerHour: readLimit("RATE_LIMIT_CHECKOUT_PER_HOUR", 10),
    eventsPerHour: readLimit("RATE_LIMIT_EVENTS_PER_HOUR", 30),
    analyticsPerMinute: readLimit("RATE_LIMIT_ANALYTICS_PER_MINUTE", 120),
    uploadsPerHour: readLimit("RATE_LIMIT_UPLOADS_PER_HOUR", 40),
  };
}
