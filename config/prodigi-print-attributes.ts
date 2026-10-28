import { printSku, type PrintProduct } from "@/config/prints";

/**
 * Prodigi attributes with exactly one valid value on the SKU (from GET /v4.0/products/{sku}).
 * Only include attributes whose exact strings are known — scripts/prodigi-quote-check.ts verifies them.
 */
export const PRODIGI_IMPLICIT_ATTRIBUTES_BY_DEFAULT_SKU: Record<string, Record<string, string>> = {
  "JIGSAW-PUZZLE-252": {
    size: "252 pieces",
  },
  "GLOBAL-SLIMCAN-12X16": {
    edge: "19mm",
    frame: "19mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
  "GLOBAL-CAN-12X16": {
    edge: "38mm",
    frame: "38mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
  "GLOBAL-CAN-16X20": {
    edge: "38mm",
    frame: "38mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
  "GLOBAL-CAN-24X32": {
    edge: "38mm",
    frame: "38mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
  "GLOBAL-FRA-CAN-16X20": {
    edge: "38mm",
    frame: "Float frame, 38mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
  "GLOBAL-FRA-CAN-20X30": {
    edge: "38mm",
    frame: "Float frame, 38mm standard stretcher bar",
    paperType: "Standard canvas (SC)",
  },
};

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
