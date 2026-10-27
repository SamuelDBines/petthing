import assert from "node:assert/strict";
import test from "node:test";
import { mergeSeedWithOverride } from "../lib/catalogue/products";
import type { CatalogueProduct } from "../lib/catalogue/types";

const seed: CatalogueProduct = {
  id: "hom-76459",
  storeId: "fixmonger",
  slug: "hom-76459",
  name: "Magnetic thermal door curtain",
  category: "door",
  description: "Full description from seed",
  benefitLine: "Stops the draught",
  pricePence: 2599,
  compareAtPricePence: 2999,
  costPence: 1199,
  supplier: "go_dropship",
  supplierSku: "HOM-76459",
  stock: 50,
  images: ["/stores/products/fixmonger/HOM-76459.webp"],
  variants: [],
  active: true,
  gpsr: {
    manufacturerName: "M",
    manufacturerAddress: "A",
    responsiblePersonName: "R",
    responsiblePersonAddress: "B",
    safetyWarnings: "Seed GPSR",
  },
};

const staleDb: CatalogueProduct = {
  ...seed,
  name: "Magnetic thermal door curtain",
  description: "",
  benefitLine: undefined,
  pricePence: 2999,
  images: ["/stores/fixmonger/placeholder-door-curtain.svg"],
  gpsrSafetyText: undefined,
  stock: 12,
  active: true,
};

test("mergeSeedWithOverride keeps seed merchandising fields", () => {
  const merged = mergeSeedWithOverride(seed, staleDb);
  assert.equal(merged.pricePence, 2599);
  assert.equal(merged.description, "Full description from seed");
  assert.equal(merged.benefitLine, "Stops the draught");
  assert.equal(merged.gpsr?.safetyWarnings, seed.gpsr?.safetyWarnings);
  assert.equal(merged.stock, 12);
  assert.match(merged.images[0], /HOM-76459\.webp/);
});
