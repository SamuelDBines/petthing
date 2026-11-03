import assert from "node:assert/strict";
import test from "node:test";
import { fbcFromFbclid } from "../lib/meta/fbc";

test("fbcFromFbclid formats Meta click cookie", () => {
  assert.equal(fbcFromFbclid("abc123", 1_700_000_000_000), "fb.1.1700000000000.abc123");
  assert.equal(fbcFromFbclid("  "), null);
});
