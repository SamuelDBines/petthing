export type IntegrationId =
  | "postgres"
  | "stripe"
  | "stripe_webhook"
  | "fal"
  | "prodigi"
  | "printful"
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
  stripe: [{ key: "STRIPE_SECRET_KEY", description: "Stripe API secret" }],
  stripe_webhook: [{ key: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook signing" }],
  fal: [{ key: "FAL_KEY", description: "fal.ai image generation" }],
  prodigi: [{ key: "PRODIGI_API_KEY", description: "Prodigi print API" }],
  printful: [{ key: "PRINTFUL_API_KEY", description: "Printful API (Jinglefold stocking)" }],
  resend: [
    { key: "RESEND_API_KEY", description: "Transactional email" },
    { key: "EMAIL_FROM", description: "From address (verified domain)" },
    { key: "ADMIN_EMAIL", description: "Admin alerts + digest" },
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
      description: "CSV order inbox (no supplier API — email automation)",
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
    integrations: ["stripe", "fal", "prodigi", "resend", "google_oauth", "storage", "artinbulk_email"],
  },
  {
    storeId: "fixmonger",
    label: "Fixmonger",
    integrations: ["stripe", "resend", "godropship_email", "storage"],
  },
  {
    storeId: "jinglefold",
    label: "Jinglefold",
    integrations: ["stripe", "fal", "prodigi", "printful", "resend", "godropship_email", "storage"],
  },
];

export function envPresent(key: string) {
  const v = process.env[key];
  return Boolean(v && String(v).trim());
}

export function validateGoLive(env: NodeJS.ProcessEnv = process.env) {
  const missing: { scope: string; key: string; description: string }[] = [];
  const check = (scope: string, reqs: EnvRequirement[]) => {
    for (const req of reqs) {
      if (req.optional) continue;
      if (!env[req.key]?.trim()) missing.push({ scope, key: req.key, description: req.description });
    }
  };
  check("global", GLOBAL_REQUIREMENTS);
  for (const profile of STORE_PROFILES) {
    for (const id of profile.integrations) {
      for (const req of INTEGRATION_ENV[id]) {
        if (req.optional) continue;
        if (!env[req.key]?.trim()) {
          missing.push({
            scope: `${profile.label} (${profile.storeId})`,
            key: req.key,
            description: req.description,
          });
        }
      }
    }
  }
  const unique = new Map<string, { scope: string; key: string; description: string }>();
  for (const row of missing) unique.set(`${row.scope}:${row.key}`, row);
  return { ok: unique.size === 0, missing: [...unique.values()] };
}
