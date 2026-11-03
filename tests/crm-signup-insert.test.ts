import test from "node:test";
import assert from "node:assert/strict";
import { signupInsertTimestampParams } from "../lib/db/crm-methods";

test("insertEmailSignup avoids JS Date params", () => {
  assert.deepEqual(signupInsertTimestampParams(true), {
    marketingConsentAt: "now()",
    createdAt: "now()",
  });
  assert.equal(signupInsertTimestampParams(false).marketingConsentAt, null);
});
