import assert from "node:assert/strict";
import test from "node:test";
import type { Job } from "../lib/domain";
import { regenJobUpdate } from "../lib/generation/regen";

function job(regenCount = 0): Job {
  return {
    id: "00000000-0000-4000-8000-000000000022",
    orderId: "order-1",
    styleId: "victorian-portrait",
    variantIndex: 0,
    status: "done",
    attempts: 2,
    providerRequestId: "fal-1",
    regenCount,
    lastError: null,
    costGbp: 0.04,
    priority: false,
    lockedUntil: null,
    nextRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("regenJobUpdate bumps regenCount and clears provider state", () => {
  const patch = regenJobUpdate(job(0));
  assert.equal(patch.regenCount, 1);
  assert.equal(patch.status, "queued");
  assert.equal(patch.providerRequestId, null);
});
