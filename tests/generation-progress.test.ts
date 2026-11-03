import assert from "node:assert/strict";
import test from "node:test";
import type { Asset, Job } from "../lib/domain";
import {
  countResultImages,
  jobsNeedingResults,
  orderHasFullPortraitSet,
  portraitGenerationProgress,
} from "../lib/generation/progress";
import { getTier } from "../config/pricing";

const tier = getTier("classic");

function job(variantIndex: number, status: Job["status"] = "done"): Job {
  return {
    id: `job-${variantIndex}`,
    orderId: "order-1",
    styleId: "victorian-portrait",
    variantIndex,
    status,
    attempts: 0,
    providerRequestId: null,
    lastError: null,
    costGbp: 0,
    priority: false,
    lockedUntil: null,
    nextRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function result(variantIndex: number): Asset {
  return {
    id: `asset-${variantIndex}`,
    orderId: "order-1",
    kind: "result",
    styleId: "victorian-portrait",
    variantIndex,
    storagePath: `path/${variantIndex}.jpg`,
    bucket: "results",
    contentType: "image/jpeg",
    moderation: "passed",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

test("portrait progress tracks expected tier image count", () => {
  const jobs = [0, 1, 2, 3, 4, 5].map((i) => job(i));
  const assets = [0, 1, 2].map((i) => result(i));
  const progress = portraitGenerationProgress(tier, jobs, assets);
  assert.equal(progress.expected, 6);
  assert.equal(progress.generated, 3);
  assert.equal(progress.complete, false);
  assert.equal(jobsNeedingResults(jobs, assets).length, 3);
  assert.equal(orderHasFullPortraitSet(tier, jobs, assets), false);
});

test("countResultImages dedupes by style and variant", () => {
  const assets = [result(0), result(0), result(1)];
  assert.equal(countResultImages(assets), 2);
});
