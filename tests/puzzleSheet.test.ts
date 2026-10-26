import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { sheetPixels } from "../config/prints";
import { composePrint } from "../lib/puzzleSheet";

test("a portrait sits inside the landscape puzzle and lid", async () => {
  const source = await sharp({
    create: { width: 30, height: 40, channels: 3, background: { r: 20, g: 40, b: 80 } },
  })
    .jpeg()
    .toBuffer();

  for (const sheet of ["board", "lid"] as const) {
    const expected = sheetPixels(sheet);
    const output = await composePrint(source, sheet);
    const meta = await sharp(output).metadata();
    assert.equal(meta.width, expected.width);
    assert.equal(meta.height, expected.height);
    assert.equal(meta.format, "jpeg");
  }
});
