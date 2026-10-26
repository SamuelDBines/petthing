import { JINGLEFOLD_PERSONALISED_PRODUCTS } from "@/config/jinglefold";

/** Prodigi catalogue SKU env vars per Jinglefold pricing SKU (see .env.example). */
export const PRODIGI_SKU_ENV: Record<string, string> = {
  "XMAS-PLAS-BAUB": "PRODIGI_SKU_XMAS_PLAS_BAUB",
  "XMAS-ALUM-SQ": "PRODIGI_SKU_XMAS_ALUM_SQ",
  "XMAS-GLASS-SQ": "PRODIGI_SKU_XMAS_GLASS_SQ",
  "XMAS-PORC-BAUB": "PRODIGI_SKU_XMAS_PORC_BAUB",
  "XMAS-WOOD": "PRODIGI_SKU_XMAS_WOOD",
  "XMAS-PLAS-BAUB-3": "PRODIGI_SKU_XMAS_PLAS_BAUB_3",
};

export const PRINTFUL_VARIANT_ENV: Record<string, string> = {
  "PF-716": "PRINTFUL_VARIANT_PF_716",
};

export function prodigiSkuForPricingSku(pricingSku: string) {
  const envName = PRODIGI_SKU_ENV[pricingSku];
  const fromEnv = envName ? process.env[envName]?.trim() : "";
  if (fromEnv) return fromEnv;
  return `MOCK-${pricingSku}`;
}

export function printfulVariantForPricingSku(pricingSku: string) {
  const envName = PRINTFUL_VARIANT_ENV[pricingSku];
  const fromEnv = envName ? process.env[envName]?.trim() : "";
  if (fromEnv) return fromEnv;
  return `mock_variant_${pricingSku}`;
}

export function personalisedProductForPricingSku(pricingSku: string) {
  return JINGLEFOLD_PERSONALISED_PRODUCTS.find((p) => p.pricingSku === pricingSku) ?? null;
}
