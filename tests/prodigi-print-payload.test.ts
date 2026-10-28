import assert from "node:assert/strict";
import test from "node:test";
import { prodigiItemAttributes, PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU } from "../config/prodigi-print-attributes";
import { PRINTS } from "../config/prints";
import {
  buildProdigiOrderLineItem,
  buildProdigiQuoteLineItem,
  isMultiValueProdigiAttribute,
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

test("prodigiItemAttributes merges static implicit attrs and explicit choices", () => {
  const slim = PRINTS.find((p) => p.id === "canvas_slim_12x16")!;
  const framed = PRINTS.find((p) => p.id === "canvas_framed_slim_16x20")!;
  const attrs = prodigiItemAttributes(slim);
  assert.equal(attrs.wrap, "MirrorWrap");
  assert.equal(attrs.edge, PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU["GLOBAL-SLIMCAN-12X16"]?.edge);
  const framedAttrs = prodigiItemAttributes(framed);
  assert.equal(framedAttrs.color, "black");
  assert.equal(framedAttrs.wrap, "MirrorWrap");
  assert.ok(framedAttrs.edge);
});

test("singleValueAttributesFromDetails picks only length-1 lists", () => {
  const details = {
    sku: "TEST",
    attributes: {
      size: ["252 Piece"],
      wrap: ["MirrorWrap", "White"],
      edge: ["Standard38mm"],
    },
    printAreas: ["default"],
  };
  assert.deepEqual(singleValueAttributesFromDetails(details), {
    size: "252 Piece",
    edge: "Standard38mm",
  });
});

test("validateProdigiLineItemAgainstProduct is strict only for multi-value attributes", () => {
  const puzzle = PRINTS.find((p) => p.id === "puzzle_252")!;
  const item = buildProdigiQuoteLineItem(puzzle);
  const details = parseProdigiProductDetails({
    product: {
      sku: "JIGSAW-PUZZLE-252",
      attributes: {
        size: ["252 Piece"],
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
        size: ["252 Piece"],
        wrap: ["MirrorWrap", "White"],
      },
      printAreas: { jigsaw: { required: true }, lid: { required: true } },
    },
  })!;
  const missingWrap = validateProdigiLineItemAgainstProduct(item, detailsWithWrap);
  assert.match(missingWrap.join(" "), /missing required attribute wrap/);
});

test("validateStaticImplicitAgainstProductDetails catches config drift", () => {
  const details = {
    sku: "GLOBAL-CAN-12X16",
    attributes: { edge: ["RealEdgeOnly"] },
    printAreas: ["default"],
  };
  const errors = validateStaticImplicitAgainstProductDetails(
    "GLOBAL-CAN-12X16",
    "GLOBAL-CAN-12X16",
    details,
    { edge: "WrongEdge" },
  );
  assert.match(errors.join(" "), /RealEdgeOnly/);
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
  assert.equal(orderItem.attributes.size, PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU["JIGSAW-PUZZLE-252"]?.size);
});
