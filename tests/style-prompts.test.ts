import assert from "node:assert/strict";
import test from "node:test";
import { assertAllStoreStylePrompts, STYLE_PROMPTS } from "../config/stylePrompts";

test("every builtin store style has a STYLE_PROMPTS entry", () => {
  assertAllStoreStylePrompts();
});

test("Jinglefold ornament styles are configured", () => {
  for (const id of ["cosy-classic", "snow-globe", "hearthside"]) {
    assert.ok(STYLE_PROMPTS[id], `missing ${id}`);
    assert.match(STYLE_PROMPTS[id].template, /circular|bauble|ornament|1:1|centred/i);
  }
});
