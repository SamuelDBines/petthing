import type { Job, Order } from "@/lib/domain";

/** Stale-worker recovery when a job is stuck in `running` without an active lock. */
export const LOCK_MS = 8 * 60 * 1000;
/** How soon to poll fal again after an in-progress queue response. */
export const FAL_POLL_INTERVAL_MS = 4_000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;

export function retryDelayMs(attempts: number) {
  return Math.min(MAX_BACKOFF_MS, 15_000 * 2 ** Math.max(0, attempts - 1));
}

export function jobIsClaimable(job: Job, order: Order | undefined, now: number) {
  if (!order || order.status === "refunded" || order.status === "pending_payment") return false;
  if (job.status === "done" || job.status === "failed" || job.status === "dead") return false;
  if (job.status === "queued") {
    return !job.nextRunAt || Date.parse(job.nextRunAt) <= now;
  }
  if (job.status === "running" || job.status === "submitted") {
    if (job.nextRunAt && Date.parse(job.nextRunAt) > now) return false;
    if (job.lockedUntil && Date.parse(job.lockedUntil) > now) return false;
    if (job.status === "running" && !job.lockedUntil && Date.parse(job.updatedAt) + LOCK_MS > now) return false;
    return true;
  }
  return false;
}
