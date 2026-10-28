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
  "GLOBAL-CFPM-A3": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
    size: "a3",
  },
  "GLOBAL-CFPM-A2": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
    size: "a2",
  },
  "GLOBAL-CFPM-16X20": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
  },
  "GLOBAL-CFPM-18X24": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
  },
  "GLOBAL-CFPM-A1": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
    size: "a1",
  },
  "GLOBAL-CFPM-24X36": {
    frame: "Classic",
    glaze: "Acrylic / Perspex",
    mount: "2.4mm",
    mountColor: "Snow white",
    paperType: "EMA",
    substrateWeight: "200gsm",
  },
  "GLOBAL-MUG-W": {
    color: "white",
    size: "313ml / 11oz",
  },
  "GLOBAL-CUSH-18X18-SUE": {
    finish: "fibre",
    paperType: "Faux Suede",
    style: "Single-sided",
  },
  "H-COAST-4PK": {
    style: "4-pack",
  },
  "GLOBAL-FAP-A2": {
    paperType: "EMA",
    size: "a2",
    substrateWeight: "200gsm",
  },
  "CLASSIC-GRE-FEDR-A5-BLA": {
    finish: "matte",
    paperType: "Fine art card",
    style: "Single",
    substrateWeight: "330gsm",
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
