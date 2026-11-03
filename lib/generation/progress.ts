import type { Tier } from "@/config/pricing";
import type { Asset, Job } from "@/lib/domain";

export function resultSlotKey(styleId: string, variantIndex: number) {
  return `${styleId}:${variantIndex}`;
}

export function countResultImages(assets: Asset[]) {
  const slots = new Set<string>();
  for (const asset of assets) {
    if (asset.kind !== "result" || asset.styleId == null || asset.variantIndex == null) continue;
    slots.add(resultSlotKey(asset.styleId, asset.variantIndex));
  }
  return slots.size;
}

export function expectedPortraitCount(tier: Tier) {
  return tier.imageCount;
}

export function portraitGenerationProgress(tier: Tier, jobs: Job[], assets: Asset[]) {
  const expected = expectedPortraitCount(tier);
  const generated = countResultImages(assets);
  const jobsMissing = jobsNeedingResults(jobs, assets);
  const complete = generated >= expected && jobsMissing.length === 0;
  return {
    expected,
    generated,
    complete,
    missingCount: Math.max(0, expected - generated),
    jobsMissing,
  };
}

export function jobsNeedingResults(jobs: Job[], assets: Asset[]) {
  return jobs.filter(
    (job) =>
      !assets.some(
        (asset) =>
          asset.kind === "result" && asset.styleId === job.styleId && asset.variantIndex === job.variantIndex,
      ),
  );
}

export function orderHasFullPortraitSet(tier: Tier, jobs: Job[], assets: Asset[]) {
  return portraitGenerationProgress(tier, jobs, assets).complete;
}
