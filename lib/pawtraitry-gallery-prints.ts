import {
  CLASSIC_FRAMED_UI,
  classicFramedProductId,
} from "@/config/pawtraitryPhysicalPrints";
import { cfpmFrameMockupAlt, cfpmFrameMockupSrc } from "@/config/pawtraitry-product-mockups";
import { GREETING_CARD_PRINT_ID, PRINTS, greetingCardPricePence, getPrint, type PrintProduct } from "@/config/prints";
import { printAreaTargetPixels } from "@/lib/print-compose";
import { portraitMeetsPrintMinimum } from "@/lib/print-compose/resolution";

export type GalleryPrintProductOffer = {
  kind: "product";
  id: string;
  name: string;
  detail: string;
  pricePence: number;
  previewImage?: string;
  previewAlt?: string;
  group?: string;
};

export type GalleryClassicFramedOffer = {
  kind: "classic_framed";
  name: string;
  detail: string;
  previewImage?: string;
  previewAlt?: string;
  sizes: { key: string; label: string; pricePence: number; productId: string | null }[];
  colors: { id: string; label: string }[];
};

export type GalleryPrintOffer = GalleryPrintProductOffer | GalleryClassicFramedOffer;

export function productMeetsPortraitResolution(product: PrintProduct, sourceWidth: number, sourceHeight: number) {
  for (const area of product.areas) {
    const target = printAreaTargetPixels(area, product);
    if (!target) continue;
    if (!portraitMeetsPrintMinimum(sourceWidth, sourceHeight, target.width, target.height)) return false;
  }
  return true;
}

export function galleryPrintOffersForPortrait(sourceWidth: number, sourceHeight: number): GalleryPrintOffer[] {
  const offers: GalleryPrintOffer[] = [];
  const classicSizes = CLASSIC_FRAMED_UI.sizes
    .map((size) => {
      const productId = classicFramedProductId(size.key, CLASSIC_FRAMED_UI.colors[0]!.id);
      const product = productId ? getPrint(productId) : null;
      const ok = product ? productMeetsPortraitResolution(product, sourceWidth, sourceHeight) : false;
      return {
        key: size.key,
        label: size.label,
        pricePence: size.fromPence,
        productId: ok ? productId : null,
      };
    })
    .filter((row) => row.productId);

  if (classicSizes.length) {
    offers.push({
      kind: "classic_framed",
      name: "Classic framed print",
      detail:
        "Classic frame with snow-white mount and acrylic glaze. Choose a size and frame colour. UK delivery included.",
      previewImage: cfpmFrameMockupSrc(CLASSIC_FRAMED_UI.colors[0]!.id),
      previewAlt: cfpmFrameMockupAlt(CLASSIC_FRAMED_UI.colors[0]!.id),
      sizes: classicSizes,
      colors: [...CLASSIC_FRAMED_UI.colors],
    });
  }

  for (const product of PRINTS) {
    if (product.group === "classic_framed") continue;
    if (!productMeetsPortraitResolution(product, sourceWidth, sourceHeight)) continue;
    offers.push({
      kind: "product",
      id: product.id,
      name: product.name,
      detail: product.detail,
      pricePence: product.pricePence,
      previewImage: product.previewImage,
      previewAlt: product.previewAlt,
      group: product.group,
    });
  }

  return offers;
}

export function greetingCardAddOnOffer() {
  return {
    productId: GREETING_CARD_PRINT_ID,
    pricePence: greetingCardPricePence(),
    name: "A5 greetings card add-on",
  };
}
