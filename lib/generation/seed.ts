import type { Job } from "@/lib/domain";

/** Stable fal seed from job id and regeneration nonce (changes on each admin regen). */
export function falPortraitSeed(job: Pick<Job, "id" | "regenCount">) {
  const nonce = job.regenCount ?? 0;
  let hash = 0;
  const input = `${job.id}:regen:${nonce}`;
  for (const char of input) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % 1_000_000;
}
