import { recentFalHealthDetail, recentFalHealthDetailFromMemory } from "@/lib/fal/provider-errors";
import { emailProviderId, sesCredentialsConfigured } from "@/lib/email/config";
import { fetchRelayEmailHealth } from "@/lib/email/relayemail-health";
import { fetchSesHealth } from "@/lib/email/ses-health";
import { envPresent } from "@/lib/go-live/requirements";
import { prodigiApiKey } from "@/lib/prodigi/config";
import { APP_CRON_JOBS, cronAuthStatus } from "@/lib/integrations/cron-jobs";

export type IntegrationStatus = "connected" | "missing" | "test_mode" | "optional_missing";

export type IntegrationHealthRow = {
  id: string;
  label: string;
  status: IntegrationStatus;
  detail?: string;
};

function stripeMode() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return "missing" as const;
  if (key.startsWith("sk_live_")) return "connected" as const;
  return "test_mode" as const;
}

function prodigiMode() {
  if (!prodigiApiKey()) return "missing" as const;
  return process.env.PRODIGI_ENV === "live" ? ("connected" as const) : ("test_mode" as const);
}

function emailRows(): IntegrationHealthRow[] {
  const rows: IntegrationHealthRow[] = [];
  const provider = emailProviderId();
  if (provider === "relayemail") {
    const relay = fetchRelayEmailHealth();
    rows.push({
      id: "email_relay",
      label: "Relay Email",
      status: relay.configured ? "connected" : "missing",
      detail: relay.detail,
    });
  }
  if (provider === "ses") {
    rows.push({
      id: "email_ses",
      label: "Amazon SES",
      status:
        sesCredentialsConfigured() && envPresent("EMAIL_FROM") ? "connected" : "missing",
      detail: "Loading sandbox / domain status…",
    });
  }
  if (envPresent("RESEND_API_KEY")) {
    rows.push({
      id: "resend",
      label: "Resend (optional)",
      status: envPresent("EMAIL_FROM") ? "optional_missing" : "missing",
      detail: provider === "resend" ? "Active provider" : "Set EMAIL_PROVIDER=resend to use",
    });
  }
  if (!rows.length) {
    rows.push({
      id: "email",
      label: "Transactional email",
      status: "missing",
      detail: "Set AWS_SES_REGION (or EMAIL_PROVIDER=ses) and EMAIL_FROM",
    });
  }
  return rows;
}

export function integrationHealth(): IntegrationHealthRow[] {
  const rows: IntegrationHealthRow[] = [
    {
      id: "postgres",
      label: "Postgres",
      status: envPresent("DATABASE_URL") ? "connected" : "missing",
    },
    {
      id: "stripe",
      label: "Stripe",
      status: stripeMode(),
      detail: stripeMode() === "test_mode" ? "Test secret key" : undefined,
    },
    {
      id: "fal",
      label: "fal.ai",
      status: envPresent("FAL_KEY") ? "connected" : "missing",
      detail: recentFalHealthDetailFromMemory(),
    },
    {
      id: "prodigi",
      label: "Prodigi",
      status: prodigiMode(),
      detail: prodigiMode() === "test_mode" ? "Sandbox API" : undefined,
    },
    {
      id: "printful",
      label: "Printful",
      status: envPresent("PRINTFUL_API_KEY") ? "connected" : "optional_missing",
      detail: "Required for Jinglefold personalised stocking",
    },
    {
      id: "godropship",
      label: "Go Dropship",
      status: envPresent("GODROPSHIP_ORDERS_EMAIL") ? "connected" : "optional_missing",
      detail: "No public API — CSV emailed to supplier inbox",
    },
    ...emailRows(),
    {
      id: "google",
      label: "Google OAuth",
      status:
        envPresent("GOOGLE_CLIENT_ID") && envPresent("GOOGLE_CLIENT_SECRET") && envPresent("AUTH_SECRET")
          ? "connected"
          : "optional_missing",
      detail: "Or use ADMIN_PASSWORD_LOGIN for dev",
    },
    {
      id: "storage",
      label: "Media storage",
      status:
        envPresent("SUPABASE_URL") && envPresent("SUPABASE_SERVICE_ROLE_KEY") ? "connected" : "test_mode",
      detail: "Local filesystem when Supabase unset",
    },
    {
      id: "artinbulk",
      label: "ArtInBulk",
      status: envPresent("ARTINBULK_ORDERS_EMAIL") ? "connected" : "optional_missing",
      detail: "Email hand-off (no API)",
    },
    {
      id: "cron",
      label: "Cron auth",
      status: cronAuthStatus(),
      detail: `${APP_CRON_JOBS.length} HTTP jobs (see /admin/health)`,
    },
    {
      id: "stripe_webhook",
      label: "Stripe webhook",
      status: envPresent("STRIPE_WEBHOOK_SECRET") ? "connected" : "missing",
    },
    {
      id: "content_worker",
      label: "Content worker",
      status: envPresent("CONTENT_WORKER_SECRET") ? "connected" : "optional_missing",
      detail: "Social queue iframe in admin",
    },
  ];
  return rows;
}

export async function integrationHealthWithEmail(): Promise<IntegrationHealthRow[]> {
  const rows = integrationHealth();
  const falIdx = rows.findIndex((r) => r.id === "fal");
  if (falIdx >= 0) {
    const falDetail = await recentFalHealthDetail();
    if (falDetail) rows[falIdx] = { ...rows[falIdx], detail: falDetail, status: "test_mode" };
  }
  if (emailProviderId() !== "ses") return rows;
  const ses = await fetchSesHealth();
  const idx = rows.findIndex((r) => r.id === "email_ses");
  if (idx < 0) return rows;
  const base = rows[idx];
  let status = base.status;
  if (ses.error) status = "missing";
  else if (ses.fromIdentityVerified === false) status = "test_mode";
  rows[idx] = {
    ...base,
    status,
    detail: ses.error ?? ses.detail ?? base.detail,
  };
  return rows;
}

export function cronJobHealth() {
  const auth = cronAuthStatus();
  return APP_CRON_JOBS.map((job) => ({
    ...job,
    auth,
    k8sManifest: "k8s/cronjob/app-operations.yaml",
  }));
}
