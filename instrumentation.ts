export async function register() {
  if (!process.env.SENTRY_DSN?.trim()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.05,
    enabled: true,
  });
}
