import { CLASSIC_FRAMED_UI, classicFramedProductId, PAWTRAITRY_PHYSICAL_PRINTS } from "@/config/pawtraitryPhysicalPrints";
import { cfpmFrameMockupSrc } from "@/config/pawtraitry-product-mockups";
import { PRINTS, getPrint, type PrintProduct, type PrintProductId } from "@/config/prints";
import { CANVAS_PRINTS } from "@/config/canvasPrints";
import type { Quality, Tier } from "@/config/pricing";
import { productMeetsGuaranteedPortrait } from "@/lib/pawtraitry/print-resolution-client";

export type PawtraitryCreateProductOffer = {
  id: PrintProductId | "classic_framed";
  name: string;
  detail: string;
  pricePence: number;
  fromPrice?: boolean;
  previewImage?: string;
  previewAlt?: string;
  group: string;
  framed?: {
    sizes: typeof CLASSIC_FRAMED_UI.sizes;
    colors: typeof CLASSIC_FRAMED_UI.colors;
    sizeKey: string;
    colorId: string;
  };
};

export function guaranteedPortraitDimensions(quality: Quality) {
  return quality === "hd" ? { width: 1536, height: 2048 } : { width: 768, height: 1024 };
}

export function productAvailableForTier(product: PrintProduct, tier: Tier) {
  const dims = guaranteedPortraitDimensions(tier.quality);
  return productMeetsGuaranteedPortrait(product, dims.width, dims.height);
}

export function pawtraitryCreateProductOffers(tier: Tier): PawtraitryCreateProductOffer[] {
  const offers: PawtraitryCreateProductOffer[] = [];
  const framedSizes = CLASSIC_FRAMED_UI.sizes.filter((size) => {
    const productId = classicFramedProductId(size.key, CLASSIC_FRAMED_UI.colors[0]!.id);
    if (!productId) return false;
    return productAvailableForTier(getPrint(productId), tier);
  });
  if (framedSizes.length) {
    offers.push({
      id: "classic_framed",
      name: "Classic framed print",
      detail: "Snow-white mount and acrylic glaze. Pick size and frame colour. UK delivery included in the price.",
      pricePence: Math.min(...framedSizes.map((s) => s.fromPence)),
      fromPrice: true,
      previewImage: cfpmFrameMockupSrc(CLASSIC_FRAMED_UI.colors[0]!.id),
      previewAlt: "Classic framed print mockup",
      group: "classic_framed",
      framed: {
        sizes: framedSizes,
        colors: CLASSIC_FRAMED_UI.colors,
        sizeKey: framedSizes[0]!.key,
        colorId: CLASSIC_FRAMED_UI.colors[0]!.id,
      },
    });
  }

  const homeware = PAWTRAITRY_PHYSICAL_PRINTS.filter((p) => p.group !== "classic_framed");
  const puzzle = PRINTS.filter((p) => p.id === "puzzle_252");
  const simple = [...homeware, ...CANVAS_PRINTS, ...puzzle];
  for (const product of simple) {
    if (!productAvailableForTier(product, tier)) continue;
    offers.push({
      id: product.id,
      name: product.name,
      detail: product.detail,
      pricePence: product.pricePence,
      previewImage: product.previewImage,
      previewAlt: product.previewAlt,
      group: product.group ?? "other",
    });
  }
  return offers;
}

export function tierDetailBullets(tier: Tier) {
  const delivery = tier.quality === "hd" ? "HD portraits, usually within a few hours" : "Standard resolution, usually within a day";
  const card = tier.includesCard ? "Printable greetings card builder in your gallery" : null;
  const styles =
    tier.styleCount === "all"
      ? `Every style in this season (${tier.imageCount} portraits)`
      : `${tier.styleCount} style${tier.styleCount === 1 ? "" : "s"}, ${tier.imageCount} portraits`;
  return [styles, tier.quality === "hd" ? "HD files for print and sharing" : "Standard files for screens and small prints", delivery, card].filter(
    Boolean,
  ) as string[];
}
