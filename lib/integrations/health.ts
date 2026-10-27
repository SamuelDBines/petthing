import { envPresent } from "@/lib/go-live/requirements";

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
  if (!envPresent("PRODIGI_API_KEY")) return "missing" as const;
  return process.env.PRODIGI_ENV === "live" ? ("connected" as const) : ("test_mode" as const);
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
    {
      id: "resend",
      label: "Resend",
      status: envPresent("RESEND_API_KEY") && envPresent("EMAIL_FROM") ? "connected" : "missing",
    },
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
      status: envPresent("CRON_SECRET") ? "connected" : "missing",
    },
  ];
  return rows;
}
