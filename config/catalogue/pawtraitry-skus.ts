import { recommendedPence } from "@/config/catalogue/pricing-seed";

/** Maps in-app product ids to rows in config/catalogue/pricing.seed.json */
export const PAWTRAITRY_SKU_BY_TIER_ID = {
  mini: "PT-DIG-1",
  classic: "PT-DIG-3",
  deluxe: "PT-DIG-ALL",
} as const;

export const PAWTRAITRY_SKU_BY_PRINT_ID = {
  puzzle_252: "PT-PUZ",
  canvas_slim_12x16: "PT-CAN-SLIM-1216",
  canvas_stretched_12x16: "PT-CAN-1216",
  canvas_stretched_16x20: "PT-CAN-1620",
  canvas_stretched_24x32: "PT-CAN-2432",
  canvas_framed_slim_16x20: "PT-FCAN-1620",
  canvas_framed_20x30: "PT-FCAN-2030",
} as const;

export const PAWTRAITRY_SKU_BY_HAND_PAINTED_TIER = {
  hand_painted_12x16: "PT-HAND-1216",
  hand_painted_16x20: "PT-HAND-1620",
} as const;

export type PawtraitryPrintId = keyof typeof PAWTRAITRY_SKU_BY_PRINT_ID;

export function pawtraitryPrintPricePence(id: PawtraitryPrintId) {
  return recommendedPence("Pawtraitry", PAWTRAITRY_SKU_BY_PRINT_ID[id]);
}
