import assert from "node:assert/strict";
import test from "node:test";
import { PRINTS } from "../config/prints";
import {
  buildProdigiOrderLineItem,
  buildProdigiQuoteLineItem,
  parseProdigiProductDetails,
  validateProdigiLineItemAgainstProduct,
} from "../lib/prodigi/print-payload";

test("puzzle print areas use jigsaw and lid for Prodigi", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252");
  assert.ok(puzzle);
  const item = buildProdigiQuoteLineItem(puzzle!);
  assert.deepEqual(
    item.assets.map((a) => a.printArea),
    ["jigsaw", "lid"],
  );
  assert.equal(Object.keys(item.attributes).length, 0);
});

test("canvas SKUs send wrap or frame color attributes", () => {
  const slim = PRINTS.find((p) => p.id === "canvas_slim_12x16");
  const stretched = PRINTS.find((p) => p.id === "canvas_stretched_12x16");
  const framed = PRINTS.find((p) => p.id === "canvas_framed_slim_16x20");
  assert.ok(slim && stretched && framed);
  assert.deepEqual(buildProdigiQuoteLineItem(slim!).attributes, { wrap: "MirrorWrap" });
  assert.equal(buildProdigiQuoteLineItem(slim!).sku, "GLOBAL-SLIMCAN-12X16");
  assert.deepEqual(buildProdigiQuoteLineItem(stretched!).attributes, { wrap: "MirrorWrap" });
  assert.deepEqual(buildProdigiQuoteLineItem(framed!).attributes, { color: "black" });
});

test("order line item matches quote shape plus sizing and asset urls", () => {
  const product = PRINTS.find((p) => p.id === "puzzle_252")!;
  const orderItem = buildProdigiOrderLineItem({
    product,
    merchantReference: "print-1",
    assets: [
      { printArea: "jigsaw", url: "https://example.com/jigsaw.jpg" },
      { printArea: "lid", url: "https://example.com/lid.jpg" },
    ],
  });
  assert.equal(orderItem.sizing, "fillPrintArea");
  assert.equal(orderItem.merchantReference, "print-1");
  assert.equal(orderItem.assets.length, 2);
});

test("validateProdigiLineItemAgainstProduct checks attributes and print areas", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252")!;
  const item = buildProdigiQuoteLineItem(puzzle);
  const details = parseProdigiProductDetails({
    product: {
      sku: "JIGSAW-PUZZLE-252",
      attributes: {},
      printAreas: { jigsaw: { required: true }, lid: { required: true } },
    },
  });
  assert.ok(details);
  assert.deepEqual(validateProdigiLineItemAgainstProduct(item, details), []);

  const bad = validateProdigiLineItemAgainstProduct(
    { ...item, assets: [{ printArea: "default" }] },
    details,
  );
  assert.match(bad.join(" "), /print area default/);
});
