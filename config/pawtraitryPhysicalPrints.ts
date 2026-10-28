import { recommendedPence } from "@/config/catalogue/pricing-seed";
import { pawtraitryPrintPricePence, type PawtraitryPrintId } from "@/config/catalogue/pawtraitry-skus";
import { cfpmFrameMockupAlt, cfpmFrameMockupSrc, PAWTRAITRY_PHYSICAL_MOCKUPS } from "@/config/pawtraitry-product-mockups";
import type { PrintProduct } from "@/config/prints";

const CFPM_SHARED = {
  frame: "Classic",
  glaze: "Acrylic / Perspex",
  mount: "2.4mm",
  mountColor: "Snow white",
  paperType: "EMA",
  substrateWeight: "200gsm",
} as const;

const CFPM_PT_SKU = {
  cfpm_a3: "PT-CFPM-A3",
  cfpm_a2: "PT-CFPM-A2",
  cfpm_16x20: "PT-CFPM-16X20",
  cfpm_18x24: "PT-CFPM-18X24",
  cfpm_a1: "PT-CFPM-A1",
  cfpm_24x36: "PT-CFPM-24X36",
} as const;

function cfpmPricePence(priceId: CfpmSize["priceId"]) {
  return recommendedPence("Pawtraitry", CFPM_PT_SKU[priceId]);
}

type CfpmSize = {
  key: string;
  name: string;
  sku: "GLOBAL-CFPM-A3" | "GLOBAL-CFPM-A2" | "GLOBAL-CFPM-16X20" | "GLOBAL-CFPM-18X24" | "GLOBAL-CFPM-A1" | "GLOBAL-CFPM-24X36";
  priceId:
    | "cfpm_a3"
    | "cfpm_a2"
    | "cfpm_16x20"
    | "cfpm_18x24"
    | "cfpm_a1"
    | "cfpm_24x36";
  widthPx: number;
  heightPx: number;
  sizeAttr?: string;
  detail: string;
};

const CFPM_SIZES: CfpmSize[] = [
  {
    key: "a3",
    name: "Classic framed print A3",
    sku: "GLOBAL-CFPM-A3",
    priceId: "cfpm_a3",
    widthPx: 2385,
    heightPx: 3825,
    sizeAttr: "a3",
    detail: "Museum-style classic frame with snow-white mount. Portrait orientation. UK delivery included.",
  },
  {
    key: "a2",
    name: "Classic framed print A2",
    sku: "GLOBAL-CFPM-A2",
    priceId: "cfpm_a2",
    widthPx: 3780,
    heightPx: 5835,
    sizeAttr: "a2",
    detail: "Large classic framed print with acrylic glaze. UK delivery included.",
  },
  {
    key: "16x20",
    name: "Classic framed print 16×20″",
    sku: "GLOBAL-CFPM-16X20",
    priceId: "cfpm_16x20",
    widthPx: 3600,
    heightPx: 4800,
    detail: "Classic frame and mount — a statement size for walls. UK delivery included.",
  },
  {
    key: "18x24",
    name: "Classic framed print 18×24″",
    sku: "GLOBAL-CFPM-18X24",
    priceId: "cfpm_18x24",
    widthPx: 4200,
    heightPx: 6000,
    detail: "Generous classic framed format. UK delivery included.",
  },
  {
    key: "a1",
    name: "Classic framed print A1",
    sku: "GLOBAL-CFPM-A1",
    priceId: "cfpm_a1",
    widthPx: 5895,
    heightPx: 8805,
    sizeAttr: "a1",
    detail: "Our largest classic framed size. UK delivery included.",
  },
  {
    key: "24x36",
    name: "Classic framed print 24×36″",
    sku: "GLOBAL-CFPM-24X36",
    priceId: "cfpm_24x36",
    widthPx: 6000,
    heightPx: 9600,
    detail: "Extra-large classic frame for hero walls. UK delivery included.",
  },
];

const FRAME_COLORS = [
  { id: "black", label: "Black frame", prodigi: "black" },
  { id: "white", label: "White frame", prodigi: "white" },
  { id: "natural", label: "Natural frame", prodigi: "natural" },
] as const;

function classicFramedPrints(): PrintProduct[] {
  const products: PrintProduct[] = [];
  for (const size of CFPM_SIZES) {
    for (const color of FRAME_COLORS) {
      products.push({
        id: `${size.priceId}_${color.id}` as PawtraitryPrintId,
        name: `${size.name} · ${color.label.toLowerCase()}`,
        detail: size.detail,
        pricePence: cfpmPricePence(size.priceId),
        skuEnv: `PRODIGI_SKU_${size.sku.replace(/-/g, "_")}`,
        defaultSku: size.sku,
        copies: 1,
        group: "classic_framed",
        previewImage: cfpmFrameMockupSrc(color.id),
        previewAlt: cfpmFrameMockupAlt(color.id),
        prodigiAttributes: {
          ...CFPM_SHARED,
          color: color.prodigi,
          ...(size.sizeAttr ? { size: size.sizeAttr } : {}),
        },
        areas: [{ printArea: "default", composer: "cover", widthPx: size.widthPx, heightPx: size.heightPx }],
      });
    }
  }
  return products;
}

export const PAWTRAITRY_PHYSICAL_PRINTS: PrintProduct[] = [
  ...classicFramedPrints(),
  {
    id: "mug_11oz_white",
    name: "11oz white mug",
    detail: "Your portrait wrapped around a dishwasher-safe ceramic mug. UK delivery included.",
    pricePence: pawtraitryPrintPricePence("mug_11oz_white"),
    skuEnv: "PRODIGI_SKU_MUG_11OZ",
    defaultSku: "GLOBAL-MUG-W",
    copies: 1,
    group: "homeware",
    previewImage: PAWTRAITRY_PHYSICAL_MOCKUPS.mug_11oz_white.src,
    previewAlt: PAWTRAITRY_PHYSICAL_MOCKUPS.mug_11oz_white.alt,
    prodigiAttributes: { color: "white", size: "313ml / 11oz" },
    areas: [{ printArea: "default", composer: "mug_wrap", widthPx: 2670, heightPx: 1110 }],
  },
  {
    id: "cushion_18_suede",
    name: "18×18″ faux suede cushion",
    detail: "Single-sided faux suede cushion with your portrait. UK delivery included.",
    pricePence: pawtraitryPrintPricePence("cushion_18_suede"),
    skuEnv: "PRODIGI_SKU_CUSHION_18",
    defaultSku: "GLOBAL-CUSH-18X18-SUE",
    copies: 1,
    group: "homeware",
    previewImage: PAWTRAITRY_PHYSICAL_MOCKUPS.cushion_18_suede.src,
    previewAlt: PAWTRAITRY_PHYSICAL_MOCKUPS.cushion_18_suede.alt,
    prodigiAttributes: { finish: "fibre", paperType: "Faux Suede", style: "Single-sided" },
    areas: [{ printArea: "default", composer: "cover", widthPx: 2775, heightPx: 2775 }],
  },
  {
    id: "coasters_4pk",
    name: "Cork coasters (set of 4)",
    detail: "The same portrait on four cork-backed coasters. UK delivery included.",
    pricePence: pawtraitryPrintPricePence("coasters_4pk"),
    skuEnv: "PRODIGI_SKU_COASTERS_4",
    defaultSku: "H-COAST-4PK",
    copies: 1,
    group: "homeware",
    previewImage: PAWTRAITRY_PHYSICAL_MOCKUPS.coasters_4pk.src,
    previewAlt: PAWTRAITRY_PHYSICAL_MOCKUPS.coasters_4pk.alt,
    prodigiAttributes: { style: "4-pack" },
    areas: [{ printArea: "default", composer: "cover", widthPx: 1251, heightPx: 1251 }],
  },
  {
    id: "poster_a2_matte",
    name: "A2 matte art print",
    detail: "Unframed EMA fine art poster — ready for your own frame. UK delivery included.",
    pricePence: pawtraitryPrintPricePence("poster_a2_matte"),
    skuEnv: "PRODIGI_SKU_POSTER_A2",
    defaultSku: "GLOBAL-FAP-A2",
    copies: 1,
    group: "poster",
    previewImage: PAWTRAITRY_PHYSICAL_MOCKUPS.poster_a2_matte.src,
    previewAlt: PAWTRAITRY_PHYSICAL_MOCKUPS.poster_a2_matte.alt,
    prodigiAttributes: { paperType: "EMA", size: "a2", substrateWeight: "200gsm" },
    areas: [{ printArea: "default", composer: "cover", widthPx: 4960, heightPx: 7015 }],
  },
  {
    id: "greeting_card_a5",
    name: "A5 greetings card",
    detail: "Folded fine-art card — your portrait on the front, Pawtraitry on the back. UK delivery included.",
    pricePence: pawtraitryPrintPricePence("greeting_card_a5"),
    skuEnv: "PRODIGI_SKU_GREETING_A5",
    defaultSku: "CLASSIC-GRE-FEDR-A5-BLA",
    copies: 1,
    group: "stationery",
    previewImage: PAWTRAITRY_PHYSICAL_MOCKUPS.greeting_card_a5.src,
    previewAlt: PAWTRAITRY_PHYSICAL_MOCKUPS.greeting_card_a5.alt,
    prodigiAttributes: {
      finish: "matte",
      paperType: "Fine art card",
      style: "Single",
      substrateWeight: "330gsm",
    },
    areas: [{ printArea: "default", composer: "greeting_card", widthPx: 7086, heightPx: 2526 }],
  },
];

export function classicFramedProductId(sizeKey: string, colorId: string) {
  const size = CFPM_SIZES.find((row) => row.key === sizeKey);
  if (!size) return null;
  const color = FRAME_COLORS.find((row) => row.id === colorId);
  if (!color) return null;
  return `${size.priceId}_${color.id}` as PawtraitryPrintId;
}

export const CLASSIC_FRAMED_UI = {
  sizes: CFPM_SIZES.map((s) => ({
    key: s.key,
    label: s.name.replace("Classic framed print ", ""),
    priceId: s.priceId,
    fromPence: cfpmPricePence(s.priceId),
  })),
  colors: FRAME_COLORS.map((c) => ({ id: c.id, label: c.label })),
};

export { CFPM_SIZES };
