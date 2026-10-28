import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { composeCoverPortrait } from "../lib/print-compose/cover";
import { composeMugWrap } from "../lib/print-compose/mugWrap";
import { portraitMeetsPrintMinimum } from "../lib/print-compose/resolution";
import { galleryPrintOffersForPortrait } from "../lib/pawtraitry-gallery-prints";
import { pawtraitryPrintPricePence } from "../config/catalogue/pawtraitry-skus";

test("Pawtraitry physical print list prices from seed", () => {
  assert.equal(pawtraitryPrintPricePence("mug_11oz_white"), 1999);
  assert.equal(pawtraitryPrintPricePence("cfpm_a3_black"), 7999);
  assert.equal(pawtraitryPrintPricePence("greeting_card_a5"), 599);
  assert.equal(pawtraitryPrintPricePence("poster_a2_matte"), 3499);
});

test("portraitMeetsPrintMinimum hides oversized print targets for small sources", () => {
  assert.equal(portraitMeetsPrintMinimum(1024, 1536, 5895, 8805), false);
  assert.equal(portraitMeetsPrintMinimum(4096, 6144, 2385, 3825), true);
});

test("galleryPrintOffersForPortrait groups classic framed sizes", () => {
  const offers = galleryPrintOffersForPortrait(4000, 6000);
  assert.ok(offers.some((row) => row.kind === "classic_framed"));
  assert.ok(offers.some((row) => row.kind === "product" && row.id === "mug_11oz_white"));
});

test("compose cover and mug wrap produce jpeg buffers", async () => {
  const sample = readFileSync("public/examples/pet-after.jpg");
  const cover = await composeCoverPortrait({ buffer: sample, width: 400, height: 600 });
  assert.ok(cover.length > 1000);
  const mug = await composeMugWrap({ buffer: sample, width: 900, height: 360 });
  assert.ok(mug.length > 1000);
});
