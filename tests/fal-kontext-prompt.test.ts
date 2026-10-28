import assert from "node:assert/strict";
import test from "node:test";
import { buildPrompt } from "../config/stylePrompts";

test("kontext prompt omits negative-style Do not include line", () => {
  const plain = buildPrompt({
    styleId: "victorian-portrait",
    subject: "pet",
    variantIndex: 0,
    quality: "standard",
  });
  const kontext = buildPrompt({
    styleId: "victorian-portrait",
    subject: "pet",
    variantIndex: 0,
    quality: "standard",
    forFalKontext: true,
  });
  assert.match(plain.prompt, /Do not include:/);
  assert.doesNotMatch(kontext.prompt, /Do not include:/);
  assert.doesNotMatch(kontext.prompt, /\bnudity\b/i);
  assert.doesNotMatch(kontext.prompt, /\bgore\b/i);
});
