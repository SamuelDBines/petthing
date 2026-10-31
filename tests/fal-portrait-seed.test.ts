import assert from "node:assert/strict";
import test from "node:test";
import { falPortraitSeed } from "../lib/generation/seed";

test("falPortraitSeed changes when regenCount increments", () => {
  const jobId = "00000000-0000-4000-8000-000000000021";
  const first = falPortraitSeed({ id: jobId, regenCount: 0 });
  const second = falPortraitSeed({ id: jobId, regenCount: 1 });
  assert.notEqual(first, second);
});
