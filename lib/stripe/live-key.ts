export function stripeLiveKeyOptInEnabled(env: NodeJS.ProcessEnv = process.env) {
  const v = (env.STRIPE_LIVE_MODE ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function stripeSecretKeyIsLive(key: string) {
  return key.startsWith("sk_live_") || key.startsWith("rk_live_");
}

export function assertStripeSecretKeyAllowed(key: string, env: NodeJS.ProcessEnv = process.env) {
  if (stripeSecretKeyIsLive(key) && !stripeLiveKeyOptInEnabled(env)) {
    throw new Error(
      "STRIPE_SECRET_KEY is a live key — set STRIPE_LIVE_MODE=true to opt in (staging should keep test keys).",
    );
  }
}

export function stripeApiLivemodeFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) return null;
  if (stripeSecretKeyIsLive(key)) return true;
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return false;
  return null;
}
