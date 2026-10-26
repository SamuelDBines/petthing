import { adminUnitCostPence } from "@/config/catalogue/pricing-seed";
import type { CatalogueBundleComponent } from "@/lib/catalogue/types";

/** Go Dropship kit SKUs for Jinglefold decor. */
export const JINGLEFOLD_BUNDLE_COMPONENTS: Record<string, CatalogueBundleComponent[]> = {
  "XM-KIT-TREE": [
    {
      supplierSku: "GEM-76745",
      quantity: 1,
      costPence: adminUnitCostPence("Christmas store", "GEM-76745"),
      label: "Baubles 20-pack",
    },
    {
      supplierSku: "GEM-76752",
      quantity: 1,
      costPence: adminUnitCostPence("Christmas store", "GEM-76752"),
      label: "Wooden nutcrackers",
    },
    {
      supplierSku: "HOM-55255",
      quantity: 1,
      costPence: adminUnitCostPence("Christmas store", "HOM-55255"),
      label: "Wreath hanger",
    },
  ],
};
