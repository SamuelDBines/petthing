import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return out;
}

const local = loadEnvLocal();
const stripeE2e = Boolean(process.env.E2E_STRIPE);
const stripeKey = stripeE2e ? local.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "" : "";
const stripeReady = stripeE2e && stripeKey.startsWith("sk_test_");

const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][]),
  ...local,
  NODE_ENV: "development",
  ADMIN_PASSWORD: local.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "portrait-dev",
  ADMIN_PASSWORD_LOGIN: "true",
  ADMIN_SESSION_SECRET: local.ADMIN_SESSION_SECRET || "e2e-admin-session",
  AUTH_SECRET: local.AUTH_SECRET || process.env.AUTH_SECRET || "e2e-auth-secret",
  CRON_SECRET: local.CRON_SECRET || "e2e-cron",
  FILE_SIGNING_SECRET: local.FILE_SIGNING_SECRET || "e2e-files",
  IP_HASH_SALT: local.IP_HASH_SALT || "e2e-ip",
  ALLOW_DEMO_CHECKOUT: "true",
  MOCK_MODERATION: "true",
  MANUAL_REVIEW: local.MANUAL_REVIEW || "true",
  DATABASE_URL: "",
  DATABASE_URL_DIRECT: "",
  E2E_STRIPE_READY: stripeReady ? "1" : "0",
  RATE_LIMIT_ORDERS_PER_HOUR: "500",
  RATE_LIMIT_CHECKOUT_PER_HOUR: "500",
  RATE_LIMIT_EVENTS_PER_HOUR: "500",
  RATE_LIMIT_UPLOADS_PER_HOUR: "500",
  RATE_LIMIT_ANALYTICS_PER_MINUTE: "5000",
};

// Mock E2E must not pick up a Stripe key from .env.local (demo checkout would be disabled).
if (!stripeReady) {
  webServerEnv.STRIPE_SECRET_KEY = "";
  webServerEnv.STRIPE_WEBHOOK_SECRET = "";
} else {
  webServerEnv.STRIPE_SECRET_KEY = stripeKey;
  webServerEnv.STRIPE_WEBHOOK_SECRET = local.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
  webServerEnv.ALLOW_DEMO_CHECKOUT = "false";
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "artifacts/playwright-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: webServerEnv,
  },
});
