import { recommendedPence } from "@/config/catalogue/pricing-seed";

export const PAWTRAITRY_BUMP_SKU = "XM-BUMP-PET";

export const PAWTRAITRY_BUMP_PRICE_PENCE = recommendedPence("Christmas store", PAWTRAITRY_BUMP_SKU);

export const PAWTRAITRY_CANVAS_FREE_BAUBLE_MIN_PENCE = 7999;

export type PawtraitryPromoSettings = {
  freeBaubleWithCanvasEnabled: boolean;
};

export const DEFAULT_PAWTRAITRY_PROMOS: PawtraitryPromoSettings = {
  freeBaubleWithCanvasEnabled: false,
};
