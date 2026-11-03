import assert from "node:assert/strict";
import test from "node:test";
import {
  FalProviderError,
  __clearFalIncidentsForTests,
  isFalProviderError,
  isFalProviderHttpStatus,
  isFalTopUpOrCreditLock,
  recentFalHealthDetailFromMemory,
  recordFalProviderIncident,
} from "../lib/fal/provider-errors";
import { isTransientError } from "../lib/transientErrors";

test("isFalProviderHttpStatus covers account and server errors", () => {
  assert.equal(isFalProviderHttpStatus(403), true);
  assert.equal(isFalProviderHttpStatus(402), true);
  assert.equal(isFalProviderHttpStatus(422), false);
});

test("isFalTopUpOrCreditLock detects TOP_UP", () => {
  assert.equal(isFalTopUpOrCreditLock(403, "User is locked. Reason: TOP_UP"), true);
  assert.equal(isFalTopUpOrCreditLock(402, "Payment required"), true);
});

test("recordFalProviderIncident surfaces credit lock in health detail", () => {
  __clearFalIncidentsForTests();
  recordFalProviderIncident("generation", 403, "User is locked. Reason: TOP_UP");
  assert.equal(recentFalHealthDetailFromMemory(), "fal: account locked / out of credit");
});

test("generation treats FalProviderError as retryable", () => {
  assert.equal(isFalProviderError(new FalProviderError(403, "TOP_UP")), true);
  assert.equal(isTransientError(new FalProviderError(403, "TOP_UP")), false);
  assert.equal(isTransientError(new FalProviderError(403, "TOP_UP")) || isFalProviderError(new FalProviderError(403, "TOP_UP")), true);
});
