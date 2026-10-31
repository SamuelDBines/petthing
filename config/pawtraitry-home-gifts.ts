import { pawtraitryPrintPricePence } from "@/config/catalogue/pawtraitry-skus";
import { formatGbp } from "@/config/pricing";
import { cfpmFrameMockupAlt, cfpmFrameMockupSrc, PAWTRAITRY_PHYSICAL_MOCKUPS } from "@/config/pawtraitry-product-mockups";

export type PawtraitryHomeGiftTile = {
  name: string;
  src: string;
  alt: string;
  pricePence: number;
  fromPrice?: boolean;
};

/** Homepage gift grid (prices from pricing seed via print SKU map). */
export function pawtraitryHomeGiftTiles(): PawtraitryHomeGiftTile[] {
  return [
    {
      name: "Classic framed print",
      src: cfpmFrameMockupSrc("black"),
      alt: cfpmFrameMockupAlt("black"),
      pricePence: pawtraitryPrintPricePence("cfpm_a3_black"),
      fromPrice: true,
    },
    {
      name: "11oz white mug",
      src: PAWTRAITRY_PHYSICAL_MOCKUPS.mug_11oz_white.src,
      alt: PAWTRAITRY_PHYSICAL_MOCKUPS.mug_11oz_white.alt,
      pricePence: pawtraitryPrintPricePence("mug_11oz_white"),
    },
    {
      name: "Faux suede cushion",
      src: PAWTRAITRY_PHYSICAL_MOCKUPS.cushion_18_suede.src,
      alt: PAWTRAITRY_PHYSICAL_MOCKUPS.cushion_18_suede.alt,
      pricePence: pawtraitryPrintPricePence("cushion_18_suede"),
    },
    {
      name: "Cork coasters (set of 4)",
      src: PAWTRAITRY_PHYSICAL_MOCKUPS.coasters_4pk.src,
      alt: PAWTRAITRY_PHYSICAL_MOCKUPS.coasters_4pk.alt,
      pricePence: pawtraitryPrintPricePence("coasters_4pk"),
    },
    {
      name: "A2 matte art print",
      src: PAWTRAITRY_PHYSICAL_MOCKUPS.poster_a2_matte.src,
      alt: PAWTRAITRY_PHYSICAL_MOCKUPS.poster_a2_matte.alt,
      pricePence: pawtraitryPrintPricePence("poster_a2_matte"),
    },
    {
      name: "A5 greetings card",
      src: PAWTRAITRY_PHYSICAL_MOCKUPS.greeting_card_a5.src,
      alt: PAWTRAITRY_PHYSICAL_MOCKUPS.greeting_card_a5.alt,
      pricePence: pawtraitryPrintPricePence("greeting_card_a5"),
    },
  ];
}

export function pawtraitryHomeGiftPriceLabel(tile: PawtraitryHomeGiftTile) {
  const amount = formatGbp(tile.pricePence);
  return tile.fromPrice ? `from ${amount}` : amount;
}
