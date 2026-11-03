import assert from "node:assert/strict";
import test from "node:test";
import { isTransientError, withTransientRetries } from "../lib/transientErrors";

test("isTransientError recognises network failures", () => {
  assert.equal(isTransientError(new Error("fetch failed")), true);
  assert.equal(isTransientError(new Error("validation failed")), false);
});

test("withTransientRetries eventually succeeds", async () => {
  let tries = 0;
  const value = await withTransientRetries(
    async () => {
      tries += 1;
      if (tries < 2) throw new Error("fetch failed");
      return "ok";
    },
    { attempts: 3, delaysMs: [0, 0, 0] },
  );
  assert.equal(value, "ok");
  assert.equal(tries, 2);
});
