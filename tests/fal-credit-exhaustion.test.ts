import assert from "node:assert/strict";
import test from "node:test";
import { FalProviderError } from "../lib/fal/provider-errors";
import {
  FAL_CREDIT_ALERT_COOLDOWN_MS,
  FAL_CREDIT_SLA_MS,
  falCreditForcedExhausted,
  probeFalCreditAvailable,
  shouldSendFalCreditAlert,
} from "../lib/fal/credit-ops";
import {
  isFalCreditExhaustedError,
  isFalCreditExhaustedHttp,
} from "../lib/fal/credit-exhaustion";
import type { Settings } from "../lib/domain";

test("isFalCreditExhaustedHttp detects 402 and credit lock bodies", () => {
  assert.equal(isFalCreditExhaustedHttp(402, "Payment Required"), true);
  assert.equal(isFalCreditExhaustedHttp(403, "User is locked. Reason: TOP_UP"), true);
  assert.equal(isFalCreditExhaustedHttp(403, "insufficient balance"), true);
  assert.equal(isFalCreditExhaustedHttp(403, "Invalid API key"), false);
  assert.equal(isFalCreditExhaustedHttp(422, "validation error"), false);
});

test("isFalCreditExhaustedError wraps FalProviderError", () => {
  assert.equal(isFalCreditExhaustedError(new FalProviderError(402, "billing exhausted")), true);
  assert.equal(isFalCreditExhaustedError(new FalProviderError(500, "server error")), false);
});

test("shouldSendFalCreditAlert dedupes within six hours", () => {
  const now = Date.parse("2026-10-28T12:00:00.000Z");
  const settings: Settings = {
    themeMode: "auto",
    activeThemeId: "halloween",
    salesPaused: false,
    queueHalted: false,
    haltReason: null,
    haltNotifiedOn: null,
    falCreditExhaustedSince: "2026-10-28T10:00:00.000Z",
    falCreditAlertSentAt: "2026-10-28T11:00:00.000Z",
  };
  assert.equal(shouldSendFalCreditAlert(settings, now), false);
  assert.equal(shouldSendFalCreditAlert(settings, now + FAL_CREDIT_ALERT_COOLDOWN_MS), true);
});

test("falCreditForcedExhausted env flag", async () => {
  const forced = { FAL_FORCE_CREDIT_EXHAUSTED: "1" } as unknown as NodeJS.ProcessEnv;
  const forcedWithKey = { FAL_FORCE_CREDIT_EXHAUSTED: "1", FAL_KEY: "x" } as unknown as NodeJS.ProcessEnv;
  assert.equal(falCreditForcedExhausted(forced), true);
  assert.equal(await probeFalCreditAvailable(forcedWithKey), false);
});

test("ordersWaitingOverSla uses 24h window", async () => {
  const { ordersWaitingOverSla } = await import("../lib/fal/credit-ops");
  const now = Date.parse("2026-10-28T12:00:00.000Z");
  const orders = [
    {
      id: "a",
      status: "waiting_for_credit" as const,
      createdAt: new Date(now - FAL_CREDIT_SLA_MS - 1000).toISOString(),
    },
    {
      id: "b",
      status: "waiting_for_credit" as const,
      createdAt: new Date(now - 1000).toISOString(),
    },
  ] as import("../lib/domain").Order[];
  assert.equal(ordersWaitingOverSla(orders, now).length, 1);
});
