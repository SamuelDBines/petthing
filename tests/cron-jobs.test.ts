import assert from "node:assert/strict";
import test from "node:test";
import { APP_CRON_JOBS } from "../lib/integrations/cron-jobs";

test("APP_CRON_JOBS lists all vercel cron paths", () => {
  const paths = APP_CRON_JOBS.map((j) => j.path).sort();
  assert.deepEqual(paths, [
    "/api/cron/abandoned-basket",
    "/api/cron/admin-digest",
    "/api/cron/cleanup",
    "/api/cron/generate",
    "/api/cron/order-watchdog",
    "/api/cron/partner-fulfillment",
    "/api/cron/shop-fulfillment",
  ]);
});
