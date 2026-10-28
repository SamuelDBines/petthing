import { CLASSIC_FRAMED_UI, classicFramedProductId, PAWTRAITRY_PHYSICAL_PRINTS } from "@/config/pawtraitryPhysicalPrints";
import { cfpmFrameMockupSrc } from "@/config/pawtraitry-product-mockups";
import { PRINTS, getPrint, type PrintProduct, type PrintProductId } from "@/config/prints";
import { CANVAS_PRINTS } from "@/config/canvasPrints";
import type { Quality, Tier } from "@/config/pricing";
import { FAL_PRINT_UPSCALE_SCALE } from "@/lib/pawtraitry/print-upscale-config";
import { productMeetsGuaranteedPortrait } from "@/lib/pawtraitry/print-resolution-client";

const MINI_FRAMED_SIZE_KEYS = new Set(["a3", "16x20"]);

export function productWithinMiniPhysicalCap(product: PrintProduct, tier: Tier) {
  if (tier.id !== "mini") return true;
  if (product.id === "poster_a2_matte") return false;
  if (product.group === "poster") {
    const size = product.prodigiAttributes?.size;
    if (size === "a2" || size === "a1") return false;
  }
  if (product.group === "canvas") {
    const w = product.widthIn ?? 0;
    const h = product.heightIn ?? 0;
    if (Math.max(w, h) > 20 || Math.min(w, h) > 16) return false;
  }
  return true;
}

export function productAvailableForTier(product: PrintProduct, tier: Tier) {
  if (!productWithinMiniPhysicalCap(product, tier)) return false;
  const dims = guaranteedPortraitDimensionsForPhysical(tier);
  return productMeetsGuaranteedPortrait(product, dims.width, dims.height);
}

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

/** Expected size after the single 4x print upscale at fulfilment (stepper gating). */
export function guaranteedPortraitDimensionsForPhysical(tier: Tier) {
  const base = guaranteedPortraitDimensions(tier.quality);
  return {
    width: base.width * FAL_PRINT_UPSCALE_SCALE,
    height: base.height * FAL_PRINT_UPSCALE_SCALE,
  };
}

export function printProductIdsAvailableForTier(tier: Tier): PrintProductId[] {
  const ids: PrintProductId[] = [];
  for (const offer of pawtraitryCreateProductOffers(tier)) {
    if (offer.id === "classic_framed") {
      for (const size of offer.framed?.sizes ?? []) {
        for (const color of offer.framed?.colors ?? []) {
          const id = classicFramedProductId(size.key, color.id);
          if (id) ids.push(id);
        }
      }
    } else {
      ids.push(offer.id as PrintProductId);
    }
  }
  return [...new Set(ids)];
}

export function pawtraitryCreateProductOffers(tier: Tier): PawtraitryCreateProductOffer[] {
  const offers: PawtraitryCreateProductOffer[] = [];
  const framedSizes = CLASSIC_FRAMED_UI.sizes.filter((size) => {
    if (tier.id === "mini" && !MINI_FRAMED_SIZE_KEYS.has(size.key)) return false;
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
