import { isStoreLive, parseLiveStores, stripeLiveSecretKey, stripeLiveWebhookSecret, stripeTestSecretKey, stripeTestWebhookSecret } from "@/lib/go-live/live-stores";
import { moderationUsesMock } from "@/lib/moderation";
import { stripeLiveKeyOptInEnabled, stripeSecretKeyIsLive } from "@/lib/stripe/live-key";
import { metaGoLiveWarnings } from "@/lib/meta/config";
import { emailStagingGateApplies } from "@/lib/email/staging-gate";

export type IntegrationId =
  | "postgres"
  | "stripe"
  | "stripe_webhook"
  | "fal"
  | "prodigi"
  | "printful"
  | "ses"
  | "relayemail"
  | "resend"
  | "google_oauth"
  | "storage"
  | "godropship_email"
  | "artinbulk_email"
  | "cron"
  | "content_worker";

export type EnvRequirement = {
  key: string;
  optional?: boolean;
  description: string;
};

export type StoreGoLiveProfile = {
  storeId: string;
  label: string;
  integrations: IntegrationId[];
};

export const GLOBAL_REQUIREMENTS: EnvRequirement[] = [
  { key: "DATABASE_URL", description: "Postgres connection" },
  { key: "CRON_SECRET", description: "Bearer secret for /api/cron/*" },
  { key: "ADMIN_SESSION_SECRET", description: "Admin cookie signing" },
  { key: "FILE_SIGNING_SECRET", description: "Signed media URLs" },
  { key: "IP_HASH_SALT", description: "Analytics IP hashing" },
];

export const INTEGRATION_ENV: Record<IntegrationId, EnvRequirement[]> = {
  postgres: [{ key: "DATABASE_URL", description: "Primary database" }],
  stripe: [
    { key: "STRIPE_SECRET_KEY", description: "Stripe API secret (test fallback)" },
    { key: "STRIPE_TEST_SECRET_KEY", optional: true, description: "Stripe test API secret (preferred on multi-store deploys)" },
    { key: "STRIPE_LIVE_SECRET_KEY", optional: true, description: "Stripe live API secret (stores in LIVE_STORES)" },
    {
      key: "STRIPE_LIVE_MODE",
      optional: true,
      description: "Set true when using STRIPE_LIVE_SECRET_KEY (required for live keys)",
    },
  ],
  stripe_webhook: [
    { key: "STRIPE_WEBHOOK_SECRET", description: "Stripe test webhook signing (fallback)" },
    { key: "STRIPE_TEST_WEBHOOK_SECRET", optional: true, description: "Stripe test webhook signing" },
    { key: "STRIPE_LIVE_WEBHOOK_SECRET", optional: true, description: "Stripe live webhook signing (LIVE_STORES)" },
  ],
  fal: [{ key: "FAL_KEY", description: "fal.ai image generation" }],
  prodigi: [
    { key: "PRODIGI_API_KEY", description: "Prodigi live print API (LIVE_STORES)" },
    { key: "PRODIGI_SANDBOX_API_KEY", optional: true, description: "Prodigi sandbox (test stores)" },
  ],
  printful: [{ key: "PRINTFUL_API_KEY", description: "Printful API (Jinglefold stocking)" }],
  ses: [
    { key: "AWS_ACCESS_KEY_ID", description: "AWS credentials for SES" },
    { key: "AWS_SECRET_ACCESS_KEY", description: "AWS secret for SES" },
    { key: "AWS_SES_REGION", optional: true, description: "SES region (default eu-west-2)" },
    { key: "EMAIL_FROM", description: "From address (verified SES identity)" },
    { key: "ADMIN_EMAIL", description: "Admin alerts + digest" },
  ],
  relayemail: [
    { key: "RELAYEMAIL_API_KEY", description: "Relay Email API bearer token" },
    { key: "RELAYEMAIL_API_BASE", optional: true, description: "Relay API base (default https://relayemail.net)" },
    { key: "EMAIL_FROM", description: "Fallback From when store brand.email unset" },
    { key: "ADMIN_EMAIL", description: "Admin alerts + digest" },
  ],
  resend: [
    { key: "RESEND_API_KEY", optional: true, description: "Optional Resend provider (EMAIL_PROVIDER=resend)" },
    { key: "EMAIL_FROM", description: "From address (verified domain)" },
  ],
  google_oauth: [
    { key: "AUTH_SECRET", description: "NextAuth secret" },
    { key: "GOOGLE_CLIENT_ID", description: "Google OAuth client ID" },
    { key: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret" },
  ],
  storage: [
    { key: "SUPABASE_URL", optional: true, description: "Blob storage (or local dev)" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", optional: true, description: "Storage service role" },
  ],
  godropship_email: [
    {
      key: "GODROPSHIP_ORDERS_EMAIL",
      optional: true,
      description: "CSV order inbox (no supplier API. Email automation)",
    },
  ],
  artinbulk_email: [
    {
      key: "ARTINBULK_ORDERS_EMAIL",
      optional: true,
      description: "Hand-painted supplier inbox",
    },
  ],
  cron: [{ key: "CRON_SECRET", description: "Cron authentication" }],
  content_worker: [
    { key: "CONTENT_WORKER_SECRET", optional: true, description: "Content worker admin API" },
    { key: "CONTENT_WORKER_DATABASE_URL", optional: true, description: "Content queue DB" },
  ],
};

export const STORE_PROFILES: StoreGoLiveProfile[] = [
  {
    storeId: "pawtraitry",
    label: "Pawtraitry",
    integrations: ["stripe", "fal", "prodigi", "relayemail", "google_oauth", "storage", "artinbulk_email"],
  },
  {
    storeId: "fixmonger",
    label: "Fixmonger",
    integrations: ["stripe", "relayemail", "godropship_email", "storage"],
  },
  {
    storeId: "jinglefold",
    label: "Jinglefold",
    integrations: ["stripe", "fal", "prodigi", "printful", "relayemail", "godropship_email", "storage"],
  },
];

export function envPresent(key: string) {
  const v = process.env[key];
  return Boolean(v && String(v).trim());
}

function pushMissing(
  missing: Map<string, { scope: string; key: string; description: string }>,
  scope: string,
  key: string,
  description: string,
) {
  missing.set(`${scope}:${key}`, { scope, key, description });
}

export function goLiveStoreProfiles(env: NodeJS.ProcessEnv = process.env) {
  const live = parseLiveStores(env);
  if (!live.size) return [];
  return STORE_PROFILES.filter((p) => live.has(p.storeId));
}

export function validateGoLive(env: NodeJS.ProcessEnv = process.env) {
  const missing = new Map<string, { scope: string; key: string; description: string }>();
  const check = (scope: string, reqs: EnvRequirement[]) => {
    for (const req of reqs) {
      if (req.optional) continue;
      if (!env[req.key]?.trim()) pushMissing(missing, scope, req.key, req.description);
    }
  };
  check("global", GLOBAL_REQUIREMENTS);

  const profiles = goLiveStoreProfiles(env);
  if (profiles.length && !adminAlertEmailValid(env)) {
    pushMissing(missing, "global", "ADMIN_EMAIL", "Set a real admin inbox (not *.local) for alerts");
  }
  for (const profile of profiles) {
    if (mockModerationEnabledForLive(profile.storeId, env)) {
      pushMissing(missing, profile.label, "MOCK_MODERATION", "Must be unset/false for LIVE_STORES (use fal.ai NSFW moderation)");
    }
    for (const id of profile.integrations) {
      if (id === "stripe") {
        if (!stripeLiveSecretKey(env)) {
          pushMissing(missing, profile.label, "STRIPE_LIVE_SECRET_KEY", "Live Stripe secret for LIVE_STORES checkout");
        }
        if (!stripeLiveKeyOptInEnabled(env)) {
          pushMissing(missing, profile.label, "STRIPE_LIVE_MODE", "Must be true when LIVE_STORES uses live Stripe");
        }
        continue;
      }
      if (id === "stripe_webhook") {
        if (!stripeLiveWebhookSecret(env)) {
          pushMissing(missing, profile.label, "STRIPE_LIVE_WEBHOOK_SECRET", "Live Stripe webhook signing secret");
        }
        continue;
      }
      if (id === "prodigi" && isStoreLive(profile.storeId, env)) {
        if (!env.PRODIGI_API_KEY?.trim()) {
          pushMissing(missing, profile.label, "PRODIGI_API_KEY", "Prodigi live API key");
        }
        continue;
      }
      for (const req of INTEGRATION_ENV[id]) {
        if (req.optional) continue;
        if (req.key.startsWith("STRIPE_") || req.key.startsWith("PRODIGI_")) continue;
        if (!env[req.key]?.trim()) {
          pushMissing(missing, `${profile.label} (${profile.storeId})`, req.key, req.description);
        }
      }
    }
  }

  const live = parseLiveStores(env);
  if (live.size > 0 && STORE_PROFILES.some((p) => !live.has(p.storeId))) {
    if (!stripeTestSecretKey(env)) {
      pushMissing(missing, "global", "STRIPE_TEST_SECRET_KEY", "Test Stripe secret for non-live stores (or STRIPE_SECRET_KEY)");
    }
    if (!stripeTestWebhookSecret(env)) {
      pushMissing(
        missing,
        "global",
        "STRIPE_TEST_WEBHOOK_SECRET",
        "Test Stripe webhook secret for non-live stores (or STRIPE_WEBHOOK_SECRET)",
      );
    }
  }

  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (key && stripeSecretKeyIsLive(key) && !stripeLiveKeyOptInEnabled(env)) {
    pushMissing(missing, "global", "STRIPE_LIVE_MODE", "Must be true when using live Stripe secret keys");
  }

  return { ok: missing.size === 0, missing: [...missing.values()] };
}

function mockModerationEnabledForLive(storeId: string, env: NodeJS.ProcessEnv) {
  return isStoreLive(storeId, env) && moderationUsesMock(env);
}

function adminAlertEmailValid(env: NodeJS.ProcessEnv) {
  const email = env.ADMIN_EMAIL?.trim() ?? "";
  if (!email || !email.includes("@")) return false;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return !domain.endsWith(".local");
}

export function validateGoLiveWarnings(env: NodeJS.ProcessEnv = process.env) {
  const warnings: { scope: string; message: string }[] = metaGoLiveWarnings(env).map((row) => ({
    scope: row.storeId,
    message: row.message,
  }));

  const live = parseLiveStores(env);
  for (const profile of STORE_PROFILES) {
    if (live.has(profile.storeId)) continue;
    if (profile.integrations.includes("prodigi") && !env.PRODIGI_SANDBOX_API_KEY?.trim()) {
      warnings.push({
        scope: profile.storeId,
        message:
          "PRODIGI_SANDBOX_API_KEY missing. Test-store Prodigi sync/submit calls are skipped with “sandbox key missing” until set",
      });
    }
  }

  if (live.size > 0) {
    const sampleGate = emailStagingGateApplies({ storeId: "fixmonger", requestHost: "fixmonger.com" }, env);
    if (!sampleGate && env.EMAIL_STAGING_GATE !== "false") {
      warnings.push({
        scope: "global",
        message:
          "Confirm EMAIL_STAGING_GATE=false on production only after canonical go-live; test stores stay gated via host logic",
      });
    }
    if (!env.EMAIL_STAGING_ALLOWLIST?.trim()) {
      warnings.push({
        scope: "global",
        message: "Set EMAIL_STAGING_ALLOWLIST for team addresses on staging/test hosts (comma-separated)",
      });
    }
  }

  return warnings;
}
