import type { Job, Order } from "@/lib/domain";

export const LOCK_MS = 8 * 60 * 1000;
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
    const until = job.lockedUntil ? Date.parse(job.lockedUntil) : Date.parse(job.updatedAt) + LOCK_MS;
    return until <= now;
  }
  return false;
}
