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

test("integrationHealth returns stripe row", () => {
  const rows = integrationHealth();
  assert.ok(rows.some((r) => r.id === "stripe"));
});
