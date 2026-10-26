import { JINGLEFOLD_BUNDLE_COMPONENTS } from "@/config/catalogue/jinglefold-bundles";
import {
  adminUnitCostPence,
  compareAtPence,
  isDroppedSku,
  pricingRowsForStore,
  recommendedPence,
} from "@/config/catalogue/pricing-seed";
import { JINGLEFOLD_CLP_BY_SKU, JINGLEFOLD_EXCLUDED_DECOR_SKUS } from "@/config/jinglefold";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { JinglefoldCutoffKind } from "@/config/jinglefold";

const PLACEHOLDER = "/stores/jinglefold/placeholder-ornament.svg";

function slugFromSku(sku: string) {
  return sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function cutoffKindForSku(sku: string): JinglefoldCutoffKind {
  return "go_dropship";
}

function buildDecorProduct(row: ReturnType<typeof pricingRowsForStore>[number]): CatalogueProduct | null {
  if (isDroppedSku(row)) return null;
  if (JINGLEFOLD_EXCLUDED_DECOR_SKUS.has(row.sku)) return null;
  const bundleComponents = JINGLEFOLD_BUNDLE_COMPONENTS[row.sku];
  const isBundle = Boolean(bundleComponents?.length);
  const costPence = isBundle
    ? bundleComponents!.reduce((sum, line) => sum + line.costPence * line.quantity, 0)
    : adminUnitCostPence("Christmas store", row.sku);

  return {
    id: slugFromSku(row.sku),
    storeId: "jinglefold",
    slug: slugFromSku(row.sku),
    name: row.name.split(",")[0]?.trim() || row.name,
    category: row.sku.startsWith("XM-KIT") ? "bundles" : "decor",
    description: row.note?.includes("scented") ? `${row.name}. UK dropship decor.` : row.name,
    supplier: "go_dropship",
    supplierSku: row.sku,
    costPence,
    pricePence: recommendedPence("Christmas store", row.sku),
    compareAtPricePence: compareAtPence("Christmas store", row.sku),
    kind: isBundle ? "bundle" : "standard",
    bundleComponents: isBundle ? bundleComponents : undefined,
    clpSafetyText: JINGLEFOLD_CLP_BY_SKU[row.sku],
    cutoffKind: cutoffKindForSku(row.sku),
    stock: 50,
    images: [PLACEHOLDER],
    variants: [],
    active: true,
  };
}

/** Ready-made decor from pricing.seed.json (Christmas store rows). */
export const JINGLEFOLD_DECOR_PRODUCTS: CatalogueProduct[] = pricingRowsForStore("Christmas store")
  .filter((row) => row.type === "dropship")
  .map(buildDecorProduct)
  .filter((product): product is CatalogueProduct => product !== null);
