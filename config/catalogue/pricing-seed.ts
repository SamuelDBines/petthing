import seed from "@/config/catalogue/pricing.seed.json";

export type PricingSkuRow = {
  store: string;
  sku: string;
  name: string;
  type: string;
  supplier: string;
  url: string;
  wholesale: number;
  shipping_to_customer: number;
  packaging: number;
  ai_cost: number;
  total_cost_not_vat_registered: number;
  recommended_price: number;
  compare_at_price: number | null;
  note: string;
};

const rows = seed.skus as PricingSkuRow[];

export type PricingStoreName = "Pawtraitry" | "Fixmonger" | "Christmas store";

export function pricingRowsForStore(store: PricingStoreName) {
  return rows.filter((row) => row.store === store);
}

export function pricingRow(store: PricingStoreName, sku: string) {
  const row = rows.find((item) => item.store === store && item.sku === sku);
  if (!row) throw new Error(`Missing pricing row: ${store} ${sku}`);
  return row;
}

export function isDroppedSku(row: PricingSkuRow) {
  return (row.note ?? "").trim().toUpperCase().startsWith("DROP");
}

export function gbpToPence(gbp: number) {
  return Math.round(gbp * 100);
}

export function recommendedPence(store: PricingStoreName, sku: string) {
  return gbpToPence(pricingRow(store, sku).recommended_price);
}

export function compareAtPence(store: PricingStoreName, sku: string): number | null {
  const value = pricingRow(store, sku).compare_at_price;
  if (value == null || Number.isNaN(value)) return null;
  return gbpToPence(value);
}

/** Estimated unit cost for admin margin (not storefront). */
export function adminUnitCostPence(store: PricingStoreName, sku: string) {
  const row = pricingRow(store, sku);
  return gbpToPence(row.wholesale + row.shipping_to_customer + row.packaging + row.ai_cost);
}

export const FIXMONGER_DELIVERY = {
  freeDeliveryOverPence: 0,
  standardDeliveryPence: 0,
};

export function fixmongerShippingPence(subtotalPence: number) {
  return subtotalPence >= FIXMONGER_DELIVERY.freeDeliveryOverPence ? 0 : FIXMONGER_DELIVERY.standardDeliveryPence;
}
