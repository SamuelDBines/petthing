import assert from "node:assert/strict";
import test from "node:test";
import { DIGITAL_SUPPLY_CONSENT_LABEL, PHOTO_CONSENT_LABEL } from "../config/brand";
import { orderInputSchema, photoConsentGiven } from "../lib/orderInput";

const base = {
  themeId: "halloween",
  subjectType: "pet" as const,
  tierId: "mini" as const,
  styleIds: ["victorian-portrait"],
  email: "owner@example.com",
  priority: false,
};

test("order input requires photo permission", () => {
  const missing = orderInputSchema.safeParse({
    ...base,
    photoConsent: false,
    digitalSupplyConsent: true,
  });
  assert.equal(missing.success, false);
  if (!missing.success) {
    assert.ok(missing.error.issues.some((issue) => issue.message === PHOTO_CONSENT_LABEL));
  }
  assert.equal(photoConsentGiven({ ...base, photoConsent: true, digitalSupplyConsent: true }), true);
  assert.equal(photoConsentGiven({ ...base, consent: true, digitalSupplyConsent: true }), true);
});

test("order input requires digital supply consent", () => {
  const missing = orderInputSchema.safeParse({
    ...base,
    photoConsent: true,
    digitalSupplyConsent: false,
  });
  assert.equal(missing.success, false);
  if (!missing.success) {
    assert.ok(missing.error.issues.some((issue) => issue.message === DIGITAL_SUPPLY_CONSENT_LABEL));
  }
});

test("order input accepts both consents", () => {
  const ok = orderInputSchema.safeParse({
    ...base,
    photoConsent: true,
    digitalSupplyConsent: true,
  });
  assert.equal(ok.success, true);
});
