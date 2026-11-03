import { adminUnitCostPence } from "@/config/catalogue/pricing-seed";

export type FixmongerBundleComponent = {
  supplierSku: string;
  quantity: number;
  costPence: number;
  label: string;
};

/** Component SKUs for Go Dropship fulfilment when a kit is sold. */
export const FIXMONGER_BUNDLE_COMPONENTS: Record<string, FixmongerBundleComponent[]> = {
  "FX-KIT-DOOR": [
    {
      supplierSku: "HOM-76459",
      quantity: 1,
      costPence: adminUnitCostPence("Fixmonger", "HOM-76459"),
      label: "Thermal door curtain 90×210",
    },
    {
      supplierSku: "HOM-61194",
      quantity: 1,
      costPence: adminUnitCostPence("Fixmonger", "HOM-61194"),
      label: "Magnetic insect screen 90×210",
    },
  ],
};
