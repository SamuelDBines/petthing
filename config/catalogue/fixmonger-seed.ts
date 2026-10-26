import { FIXMONGER_BUNDLE_COMPONENTS } from "@/config/catalogue/fixmonger-bundles";
import {
  adminUnitCostPence,
  compareAtPence,
  isDroppedSku,
  pricingRowsForStore,
  recommendedPence,
} from "@/config/catalogue/pricing-seed";
import type { CatalogueProduct } from "@/lib/catalogue/types";

const PLACEHOLDER = {
  winter: "/stores/fixmonger/placeholder-frost-cover.svg",
  door: "/stores/fixmonger/placeholder-door-curtain.svg",
  brush: "/stores/fixmonger/placeholder-snow-brush.svg",
  car: "/stores/fixmonger/placeholder-frost-cover.svg",
  home: "/stores/fixmonger/placeholder-door-curtain.svg",
  bundle: "/stores/fixmonger/placeholder-snow-brush.svg",
} as const;

const COPY: Record<string, { category: string; description: string; image: string }> = {
  "HOM-76459": {
    category: "winter",
    description:
      "Keeps the draught out without wrestling with a door strip every time the dog wants in. Magnets snap shut behind you.",
    image: PLACEHOLDER.door,
  },
  "HOM-76454": {
    category: "winter",
    description: "Same magnetic thermal curtain in an 80×200cm size for narrower doorways.",
    image: PLACEHOLDER.door,
  },
  "CAR-46787": {
    category: "winter",
    description: "Stop scraping at 6am. Elastic hooks, fits most hatchbacks and estates.",
    image: PLACEHOLDER.winter,
  },
  "HOM-62916": {
    category: "winter",
    description: "Larger windscreen cover for SUVs and 4×4s — 157×126cm with mirror flaps.",
    image: PLACEHOLDER.winter,
  },
  "HOM-74935": {
    category: "winter",
    description: "Brush, scraper, squeegee, and extendable handle — the boot of every British winter.",
    image: PLACEHOLDER.brush,
  },
  "AB6701": {
    category: "winter",
    description: "Two-piece extendable snow brush and ice scraper set for quick clears.",
    image: PLACEHOLDER.brush,
  },
  "HOM-56098": {
    category: "garden",
    description: "2×10m frost fleece roll to tuck tender plants in before the first hard frost.",
    image: PLACEHOLDER.home,
  },
  "HOM-55115": {
    category: "garden",
    description: "Reusable plant jacket — zip it round pots and small shrubs on cold nights.",
    image: PLACEHOLDER.home,
  },
  "GEM-76744": {
    category: "storage",
    description: "Heavy-duty bag for a disassembled tree — zip, handles, and no more loft chaos.",
    image: PLACEHOLDER.home,
  },
  "CAR-63366": {
    category: "car",
    description: "Pockets for tablets, bottles, and the stuff that usually slides under the seat.",
    image: PLACEHOLDER.car,
  },
  "CAR-76112": {
    category: "car",
    description: "Memory-foam headrest pillow for long motorway stints.",
    image: PLACEHOLDER.car,
  },
  "CAR-75067": {
    category: "car",
    description: "Visible steering-wheel lock — cheap peace of mind on the drive.",
    image: PLACEHOLDER.car,
  },
  "HOM-53076": {
    category: "home",
    description: "Stick-on insect mesh so you can air the house without the midges.",
    image: PLACEHOLDER.home,
  },
  "HB-75865": {
    category: "car",
    description: "Pair of pop-on rear sun shades — stops the kids complaining on sunny school runs.",
    image: PLACEHOLDER.car,
  },
  "FX-KIT-CAR": {
    category: "bundles",
    description: "Winter car kit: windscreen frost cover plus 2-piece snow brush and ice scraper.",
    image: PLACEHOLDER.bundle,
  },
  "FX-KIT-DOOR": {
    category: "bundles",
    description: "Draught-proof door kit: 90×210 magnetic thermal curtain plus a windscreen frost cover.",
    image: PLACEHOLDER.bundle,
  },
  "FX-KIT-GARDEN": {
    category: "bundles",
    description: "Garden frost kit: 2×10m fleece roll plus two plant frost jackets.",
    image: PLACEHOLDER.bundle,
  },
};

function slugFromSku(sku: string) {
  return sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildProduct(row: ReturnType<typeof pricingRowsForStore>[number]): CatalogueProduct | null {
  if (isDroppedSku(row)) return null;
  const meta = COPY[row.sku] ?? {
    category: "home",
    description: row.name,
    image: PLACEHOLDER.home,
  };
  const bundleComponents = FIXMONGER_BUNDLE_COMPONENTS[row.sku];
  const isBundle = Boolean(bundleComponents?.length);
  const costPence = isBundle
    ? bundleComponents!.reduce((sum, line) => sum + line.costPence * line.quantity, 0)
    : adminUnitCostPence("Fixmonger", row.sku);

  return {
    id: slugFromSku(row.sku),
    storeId: "fixmonger",
    slug: slugFromSku(row.sku),
    name: isBundle ? row.name.split(":")[0]?.trim() || row.name : row.name,
    category: meta.category,
    description: meta.description,
    supplier: "go_dropship",
    supplierSku: row.sku,
    costPence,
    pricePence: recommendedPence("Fixmonger", row.sku),
    compareAtPricePence: compareAtPence("Fixmonger", row.sku),
    kind: isBundle ? "bundle" : "standard",
    bundleComponents: isBundle ? bundleComponents : undefined,
    stock: 50,
    images: [meta.image],
    variants: [],
    active: true,
  };
}

/** Fixmonger catalogue from config/catalogue/pricing.seed.json (re-price there). */
export const FIXMONGER_SEED_PRODUCTS: CatalogueProduct[] = pricingRowsForStore("Fixmonger")
  .map(buildProduct)
  .filter((product): product is CatalogueProduct => product !== null);
