import { CANVAS_PRINTS } from "@/config/canvasPrints";
import { printSku, type PrintProduct } from "@/config/prints";

/**
 * Prodigi attributes with exactly one valid value on the SKU (from GET /v4.0/products/{sku}).
 * Keep in sync with live product details — scripts/prodigi-quote-check.ts verifies these.
 */
const CANVAS_IMPLICIT = {
  edge: "Standard38mm",
  frame: "StandardStretcherBar",
  paperType: "StandardCanvas",
  substrateWeight: "400gsm",
} as const;

const PUZZLE_IMPLICIT = {
  size: "252 Piece",
} as const;

function canvasSkus(): string[] {
  return CANVAS_PRINTS.map((p) => p.defaultSku);
}

function buildImplicitByDefaultSku(): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {
    "JIGSAW-PUZZLE-252": { ...PUZZLE_IMPLICIT },
  };
  for (const sku of canvasSkus()) {
    map[sku] = { ...CANVAS_IMPLICIT };
  }
  return map;
}

export const PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU = buildImplicitByDefaultSku();

export function prodigiStaticImplicitAttributes(resolvedSku: string, defaultSku: string): Record<string, string> {
  return {
    ...(PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU[defaultSku] ?? {}),
    ...(PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU[resolvedSku] ?? {}),
  };
}

export function prodigiItemAttributes(product: PrintProduct): Record<string, string> {
  const resolvedSku = printSku(product);
  return {
    ...prodigiStaticImplicitAttributes(resolvedSku, product.defaultSku),
    ...(product.prodigiAttributes ?? {}),
  };
}
