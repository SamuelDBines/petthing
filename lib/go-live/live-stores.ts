import { assertStripeSecretKeyAllowed, stripeLiveKeyOptInEnabled } from "@/lib/stripe/live-key";

export function parseLiveStores(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const raw = env.LIVE_STORES?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isStoreLive(storeId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return parseLiveStores(env).has(storeId.toLowerCase());
}

export function storeExpectsStripeLivemode(storeId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return isStoreLive(storeId, env);
}

export function stripeTestSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.STRIPE_TEST_SECRET_KEY?.trim() || env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeLiveSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.STRIPE_LIVE_SECRET_KEY?.trim() || "";
}

export function stripeSecretKeyForStore(storeId: string, env: NodeJS.ProcessEnv = process.env): string {
  if (isStoreLive(storeId, env)) {
    const key = stripeLiveSecretKey(env);
    if (!key) {
      throw new Error(`Store "${storeId}" is in LIVE_STORES but STRIPE_LIVE_SECRET_KEY is not set.`);
    }
    if (!stripeLiveKeyOptInEnabled(env)) {
      throw new Error(`Store "${storeId}" is live — set STRIPE_LIVE_MODE=true with STRIPE_LIVE_SECRET_KEY.`);
    }
    assertStripeSecretKeyAllowed(key, env);
    return key;
  }
  const key = stripeTestSecretKey(env);
  if (key) assertStripeSecretKeyAllowed(key, env);
  return key;
}

export function stripeTestWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return env.STRIPE_TEST_WEBHOOK_SECRET?.trim() || env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function stripeLiveWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return env.STRIPE_LIVE_WEBHOOK_SECRET?.trim() || "";
}

export function stripeWebhookSecrets(env: NodeJS.ProcessEnv = process.env) {
  return {
    live: stripeLiveWebhookSecret(env) || null,
    test: stripeTestWebhookSecret(env) || null,
  };
}

export function storeAllowsMetaAds(storeId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return isStoreLive(storeId, env);
}

export function storeAllowsSupplierOrderEmail(storeId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return isStoreLive(storeId, env);
}

export function prodigiApiKeyForStore(storeId: string, env: NodeJS.ProcessEnv = process.env): string {
  if (isStoreLive(storeId, env)) {
    return env.PRODIGI_API_KEY?.trim() || "";
  }
  return env.PRODIGI_SANDBOX_API_KEY?.trim() || env.PRODIGI_API_KEY?.trim() || "";
}

export function prodigiUsesLiveApi(storeId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return isStoreLive(storeId, env);
}
