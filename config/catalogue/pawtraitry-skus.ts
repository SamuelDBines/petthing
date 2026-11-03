import { recommendedPence } from "@/config/catalogue/pricing-seed";

/** Maps in-app product ids to rows in config/catalogue/pricing.seed.json */
export const PAWTRAITRY_SKU_BY_TIER_ID = {
  mini: "PT-DIG-1",
  classic: "PT-DIG-3",
  deluxe: "PT-DIG-ALL",
} as const;

const CFPM_COLOR_SUFFIXES = ["black", "white", "natural"] as const;
const CFPM_BASE_PRINT_IDS = {
  cfpm_a3: "PT-CFPM-A3",
  cfpm_a2: "PT-CFPM-A2",
  cfpm_16x20: "PT-CFPM-16X20",
  cfpm_18x24: "PT-CFPM-18X24",
  cfpm_a1: "PT-CFPM-A1",
  cfpm_24x36: "PT-CFPM-24X36",
} as const;

type CfpmVariantId = `${keyof typeof CFPM_BASE_PRINT_IDS}_${(typeof CFPM_COLOR_SUFFIXES)[number]}`;

function cfpmVariantIds(): { [K in CfpmVariantId]: (typeof CFPM_BASE_PRINT_IDS)[keyof typeof CFPM_BASE_PRINT_IDS] } {
  const out = {} as { [K in CfpmVariantId]: (typeof CFPM_BASE_PRINT_IDS)[keyof typeof CFPM_BASE_PRINT_IDS] };
  for (const baseId of Object.keys(CFPM_BASE_PRINT_IDS) as (keyof typeof CFPM_BASE_PRINT_IDS)[]) {
    for (const color of CFPM_COLOR_SUFFIXES) {
      const key = `${baseId}_${color}` as CfpmVariantId;
      out[key] = CFPM_BASE_PRINT_IDS[baseId];
    }
  }
  return out;
}

export const PAWTRAITRY_SKU_BY_PRINT_ID = {
  puzzle_252: "PT-PUZ",
  canvas_slim_12x16: "PT-CAN-SLIM-1216",
  canvas_stretched_12x16: "PT-CAN-1216",
  canvas_stretched_16x20: "PT-CAN-1620",
  canvas_stretched_24x32: "PT-CAN-2432",
  canvas_framed_slim_16x20: "PT-FCAN-1620",
  canvas_framed_20x30: "PT-FCAN-2030",
  ...cfpmVariantIds(),
  mug_11oz_white: "PT-MUG-11",
  cushion_18_suede: "PT-CUSH-18",
  coasters_4pk: "PT-COAST-4",
  poster_a2_matte: "PT-POST-A2",
  greeting_card_a5: "PT-CARD-A5",
} as const;

export const PAWTRAITRY_SKU_BY_HAND_PAINTED_TIER = {
  hand_painted_12x16: "PT-HAND-1216",
  hand_painted_16x20: "PT-HAND-1620",
} as const;

export type PawtraitryPrintId = keyof typeof PAWTRAITRY_SKU_BY_PRINT_ID;

export function pawtraitryPrintPricePence(id: PawtraitryPrintId) {
  return recommendedPence("Pawtraitry", PAWTRAITRY_SKU_BY_PRINT_ID[id]);
}
