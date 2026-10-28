import assert from "node:assert/strict";
import test from "node:test";
import { metaGoLiveWarnings } from "../lib/meta/config";

test("metaGoLiveWarnings flags CAPI without pixel", () => {
  const warnings = metaGoLiveWarnings({
    ...process.env,
    LIVE_STORES: "pawtraitry",
    META_CAPI_TOKEN_PAWTRAITRY: "secret",
  });
  assert.ok(warnings.some((w) => w.storeId === "pawtraitry" && w.message.includes("META_PIXEL_ID_PAWTRAITRY")));
});

test("metaGoLiveWarnings flags pixel without CAPI token", () => {
  const warnings = metaGoLiveWarnings({
    ...process.env,
    LIVE_STORES: "pawtraitry",
    META_PIXEL_ID_PAWTRAITRY: "999",
  });
  assert.ok(warnings.some((w) => w.storeId === "pawtraitry" && w.message.includes("META_CAPI_TOKEN")));
});
