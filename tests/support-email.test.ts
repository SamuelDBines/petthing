import test from "node:test";
import assert from "node:assert/strict";
import { supportEmailForStore } from "../lib/tenant/support-email";

test("supportEmailForStore prefers per-store env then primary domain", () => {
  const prevGlobal = process.env.SUPPORT_EMAIL;
  const prevFm = process.env.SUPPORT_EMAIL_FIXMONGER;
  process.env.SUPPORT_EMAIL = "hello@pawtraitry.com";
  delete process.env.SUPPORT_EMAIL_FIXMONGER;
  assert.equal(
    supportEmailForStore("fixmonger", { domains: ["fixmonger.example.com"], brandFallback: "hello@fixmonger.co.uk" }),
    "hello@fixmonger.example.com",
  );
  process.env.SUPPORT_EMAIL_FIXMONGER = "support@fixmonger.example.com";
  assert.equal(
    supportEmailForStore("fixmonger", { domains: ["fixmonger.example.com"] }),
    "support@fixmonger.example.com",
  );
  process.env.SUPPORT_EMAIL = prevGlobal;
  process.env.SUPPORT_EMAIL_FIXMONGER = prevFm;
});
