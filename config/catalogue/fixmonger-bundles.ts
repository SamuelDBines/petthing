import { adminUnitCostPence } from "@/config/catalogue/pricing-seed";

export type FixmongerBundleComponent = {
  supplierSku: string;
  quantity: number;
  costPence: number;
  label: string;
};

/** Component SKUs for Go Dropship fulfilment when a kit is sold. */
export const FIXMONGER_BUNDLE_COMPONENTS: Record<string, FixmongerBundleComponent[]> = {
  "FX-KIT-CAR": [
    { supplierSku: "CAR-46787", quantity: 1, costPence: adminUnitCostPence("Fixmonger", "CAR-46787"), label: "Frost cover" },
    { supplierSku: "AB6701", quantity: 1, costPence: adminUnitCostPence("Fixmonger", "AB6701"), label: "2pc snow brush" },
  ],
  "FX-KIT-DOOR": [
    { supplierSku: "HOM-76459", quantity: 1, costPence: adminUnitCostPence("Fixmonger", "HOM-76459"), label: "Door curtain 90×210" },
    { supplierSku: "CAR-46787", quantity: 1, costPence: adminUnitCostPence("Fixmonger", "CAR-46787"), label: "Frost cover" },
  ],
  "FX-KIT-GARDEN": [
    { supplierSku: "HOM-56098", quantity: 1, costPence: adminUnitCostPence("Fixmonger", "HOM-56098"), label: "Frost fleece 2×10m" },
    { supplierSku: "HOM-55115", quantity: 2, costPence: adminUnitCostPence("Fixmonger", "HOM-55115"), label: "Plant frost jacket" },
  ],
};
