/** Scheduled HTTP jobs — mirrors vercel.json and k8s/cronjob/app-operations.yaml */
export type CronJobDef = {
  id: string;
  path: string;
  schedule: string;
  description: string;
};

export const APP_CRON_JOBS: CronJobDef[] = [
  { id: "generate", path: "/api/cron/generate", schedule: "*/2 * * * *", description: "Portrait generation queue" },
  { id: "cleanup", path: "/api/cron/cleanup", schedule: "20 3 * * *", description: "Data retention cleanup" },
  { id: "partner-fulfillment", path: "/api/cron/partner-fulfillment", schedule: "0 */6 * * *", description: "Prodigi/Printful tracking sync" },
  { id: "shop-fulfillment", path: "/api/cron/shop-fulfillment", schedule: "15 * * * *", description: "Go Dropship auto CSV + supplier email" },
  { id: "order-watchdog", path: "/api/cron/order-watchdog", schedule: "30 */4 * * *", description: "Retries, stuck orders, print sync, auto-delivered" },
  { id: "abandoned-basket", path: "/api/cron/abandoned-basket", schedule: "0 */2 * * *", description: "PECR opt-in abandoned checkout reminders" },
  { id: "admin-digest", path: "/api/cron/admin-digest", schedule: "0 7 * * *", description: "Daily ops digest email" },
];

export function cronAuthStatus(): "connected" | "missing" {
  const v = process.env.CRON_SECRET;
  return v && String(v).trim() ? "connected" : "missing";
}
