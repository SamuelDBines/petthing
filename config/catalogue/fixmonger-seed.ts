import { FIXMONGER_BUNDLE_COMPONENTS } from "@/config/catalogue/fixmonger-bundles";
import { FIXMONGER_COPY } from "@/config/catalogue/fixmonger-copy";
import {
  adminUnitCostPence,
  compareAtPence,
  isDroppedSku,
  pricingRowsForStore,
  recommendedPence,
} from "@/config/catalogue/pricing-seed";
import { gpsrForSupplier } from "@/config/gpsr-defaults";
import { resolveProductImages } from "@/lib/catalogue/product-images";
import type { CatalogueProduct } from "@/lib/catalogue/types";

const PLACEHOLDER = "/stores/fixmonger/placeholder-door-curtain.svg";

function slugFromSku(sku: string) {
  return sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildProduct(row: ReturnType<typeof pricingRowsForStore>[number]): CatalogueProduct | null {
  if (isDroppedSku(row)) return null;
  const copy = FIXMONGER_COPY[row.sku];
  const bundleComponents = FIXMONGER_BUNDLE_COMPONENTS[row.sku];
  const isBundle = Boolean(bundleComponents?.length);
  const costPence = isBundle
    ? bundleComponents!.reduce((sum, line) => sum + line.costPence * line.quantity, 0)
    : adminUnitCostPence("Fixmonger", row.sku);

  const name = copy?.name ?? row.name;
  const { paths, meta } = resolveProductImages("fixmonger", row.sku, PLACEHOLDER, name);

  return {
    id: slugFromSku(row.sku),
    storeId: "fixmonger",
    slug: slugFromSku(row.sku),
    name,
    category: copy?.category ?? "home",
    description: copy?.benefit ?? copy?.description ?? row.name,
    benefitLine: copy?.benefit,
    longDescription: copy?.description,
    specs: copy?.specs,
    deliveryEstimate: copy?.delivery,
    gpsrSafetyText: copy?.gpsr,
    gpsr: gpsrForSupplier("go_dropship", copy?.gpsr ? { safetyWarnings: copy.gpsr } : undefined),
    supplier: "go_dropship",
    supplierSku: row.sku,
    costPence,
    pricePence: recommendedPence("Fixmonger", row.sku),
    compareAtPricePence: compareAtPence("Fixmonger", row.sku),
    kind: isBundle ? "bundle" : "standard",
    bundleComponents: isBundle ? bundleComponents : undefined,
    stock: 50,
    images: paths,
    imageMeta: meta,
    variants: [],
    active: true,
  };
}

/** Fixmonger catalogue from config/catalogue/pricing.seed.json (re-price there). */
export const FIXMONGER_SEED_PRODUCTS: CatalogueProduct[] = pricingRowsForStore("Fixmonger")
  .map(buildProduct)
  .filter((product): product is CatalogueProduct => product !== null);
