import assert from "node:assert/strict";
import test from "node:test";
import { prodigiItemAttributes, PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU } from "../config/prodigi-print-attributes";
import { PRINTS } from "../config/prints";
import {
  buildProdigiOrderLineItem,
  buildProdigiQuoteLineItem,
  parseProdigiProductDetails,
  singleValueAttributesFromDetails,
  validateProdigiLineItemAgainstProduct,
  validateStaticImplicitAgainstProductDetails,
} from "../lib/prodigi/print-payload";

test("puzzle print areas use jigsaw and lid for Prodigi", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252");
  assert.ok(puzzle);
  const item = buildProdigiQuoteLineItem(puzzle!);
  assert.deepEqual(
    item.assets.map((a) => a.printArea),
    ["jigsaw", "lid"],
  );
});

test("prodigiItemAttributes merges per-SKU implicit attrs and explicit choices", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252")!;
  assert.equal(prodigiItemAttributes(puzzle).size, "252 pieces");
  assert.equal(prodigiItemAttributes(puzzle).substrateWeight, undefined);

  const slim = PRINTS.find((p) => p.id === "canvas_slim_12x16")!;
  const slimAttrs = prodigiItemAttributes(slim);
  assert.equal(slimAttrs.wrap, "MirrorWrap");
  assert.equal(slimAttrs.edge, "19mm");
  assert.equal(slimAttrs.frame, "19mm standard stretcher bar");
  assert.equal(slimAttrs.paperType, "Standard canvas (SC)");

  const stretched = PRINTS.find((p) => p.id === "canvas_stretched_12x16")!;
  assert.equal(prodigiItemAttributes(stretched).edge, "38mm");
  assert.equal(prodigiItemAttributes(stretched).frame, "38mm standard stretcher bar");

  const framed = PRINTS.find((p) => p.id === "canvas_framed_slim_16x20")!;
  const framedAttrs = prodigiItemAttributes(framed);
  assert.equal(framedAttrs.color, "black");
  assert.equal(framedAttrs.wrap, "MirrorWrap");
  assert.equal(framedAttrs.frame, "Float frame, 38mm standard stretcher bar");
});

test("implicit map has an entry for every Pawtraitry print default SKU", () => {
  for (const product of PRINTS) {
    assert.ok(
      PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU[product.defaultSku],
      `missing implicit attrs for ${product.defaultSku}`,
    );
  }
});

test("singleValueAttributesFromDetails picks only length-1 lists", () => {
  const details = {
    sku: "TEST",
    attributes: {
      size: ["252 pieces"],
      wrap: ["MirrorWrap", "White"],
      edge: ["38mm"],
      substrateWeight: ["400gsm"],
    },
    printAreas: ["default"],
  };
  assert.deepEqual(singleValueAttributesFromDetails(details), {
    size: "252 pieces",
    edge: "38mm",
    substrateWeight: "400gsm",
  });
});

test("validateProdigiLineItemAgainstProduct is strict only for multi-value attributes", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252")!;
  const item = buildProdigiQuoteLineItem(puzzle);
  const details = parseProdigiProductDetails({
    product: {
      sku: "JIGSAW-PUZZLE-252",
      attributes: {
        size: ["252 pieces"],
      },
      printAreas: { jigsaw: { required: true }, lid: { required: true } },
    },
  });
  assert.ok(details);
  assert.deepEqual(validateProdigiLineItemAgainstProduct(item, details), []);

  const detailsWithWrap = parseProdigiProductDetails({
    product: {
      sku: "JIGSAW-PUZZLE-252",
      attributes: {
        size: ["252 pieces"],
        wrap: ["MirrorWrap", "White"],
      },
      printAreas: { jigsaw: { required: true }, lid: { required: true } },
    },
  })!;
  const missingWrap = validateProdigiLineItemAgainstProduct(item, detailsWithWrap);
  assert.match(missingWrap.join(" "), /missing required attribute wrap/);
});

test("validateStaticImplicitAgainstProductDetails checks configured keys only", () => {
  const details = {
    sku: "GLOBAL-CAN-12X16",
    attributes: {
      edge: ["38mm"],
      frame: ["38mm standard stretcher bar"],
      paperType: ["Standard canvas (SC)"],
      substrateWeight: ["400gsm"],
    },
    printAreas: ["default"],
  };
  assert.deepEqual(
    validateStaticImplicitAgainstProductDetails(
      "GLOBAL-CAN-12X16",
      "GLOBAL-CAN-12X16",
      details,
      PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU["GLOBAL-CAN-12X16"]!,
    ),
    [],
  );

  const errors = validateStaticImplicitAgainstProductDetails(
    "GLOBAL-CAN-12X16",
    "GLOBAL-CAN-12X16",
    details,
    { edge: "WrongEdge" },
  );
  assert.match(errors.join(" "), /not in Prodigi/);
});

test("order line item includes implicit and explicit attributes", () => {
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
  assert.equal(orderItem.attributes.size, "252 pieces");
});
