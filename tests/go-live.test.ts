import assert from "node:assert/strict";
import test from "node:test";
import { validateGoLive } from "../lib/go-live/requirements";
import { integrationHealth } from "../lib/integrations/health";

test("validateGoLive reports missing keys in empty env slice", () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const result = validateGoLive(process.env);
  assert.equal(result.ok, false);
  assert.ok(result.missing.some((m) => m.key === "DATABASE_URL"));
  if (prev) process.env.DATABASE_URL = prev;
});

test("validateGoLive only checks LIVE_STORES profiles", () => {
  const prev = { LIVE_STORES: process.env.LIVE_STORES, STRIPE_LIVE_SECRET_KEY: process.env.STRIPE_LIVE_SECRET_KEY };
  process.env.LIVE_STORES = "pawtraitry";
  delete process.env.STRIPE_LIVE_SECRET_KEY;
  const result = validateGoLive(process.env);
  assert.equal(result.ok, false);
  assert.ok(result.missing.some((m) => m.key === "STRIPE_LIVE_SECRET_KEY" && m.scope === "Pawtraitry"));
  assert.ok(!result.missing.some((m) => m.scope.includes("Fixmonger")));
  if (prev.LIVE_STORES === undefined) delete process.env.LIVE_STORES;
  else process.env.LIVE_STORES = prev.LIVE_STORES;
  if (prev.STRIPE_LIVE_SECRET_KEY === undefined) delete process.env.STRIPE_LIVE_SECRET_KEY;
  else process.env.STRIPE_LIVE_SECRET_KEY = prev.STRIPE_LIVE_SECRET_KEY;
});

test("integrationHealth returns stripe row", () => {
  const rows = integrationHealth();
  assert.ok(rows.some((r) => r.id === "stripe"));
});
