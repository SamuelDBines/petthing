import { compareAtPence, recommendedPence } from "@/config/catalogue/pricing-seed";
import type { Tier } from "@/config/pricing";
export const JINGLEFOLD_STORE_ID = "jinglefold";

export const JINGLEFOLD_DELIVERY = {
  freeDeliveryOverPence: 3000,
  standardDeliveryPence: 299,
};

export type JinglefoldCutoffKind = "prodigi_bauble" | "printful_stocking" | "go_dropship";

export type JinglefoldCutoffs = {
  prodigiBaubleIso: string;
  printfulStockingIso: string;
  goDropshipDecorIso: string;
};

export const DEFAULT_JINGLEFOLD_CUTOFFS: JinglefoldCutoffs = {
  prodigiBaubleIso: "2026-12-10T23:59:00.000Z",
  printfulStockingIso: "2026-11-26T23:59:00.000Z",
  goDropshipDecorIso: "2026-12-14T23:59:00.000Z",
};

/** SKUs excluded from Jinglefold decor (DROP, solar/mains, Pawtraitry-only bump). */
export const JINGLEFOLD_EXCLUDED_DECOR_SKUS = new Set([
  "GEM-76737",
  "EPG-75516",
  "HB-76392",
  "XM-BUMP-PET",
  "XMAS-PLAS-BAUB",
  "XMAS-ALUM-SQ",
  "XMAS-GLASS-SQ",
  "XMAS-PORC-BAUB",
  "XMAS-WOOD",
  "PF-716",
  "XMAS-PLAS-BAUB-3",
]);

export const JINGLEFOLD_PERSONALISED_PRODUCTS = [
  {
    id: "jf_plas_baub",
    slug: "personalised-shatterproof-bauble",
    pricingSku: "XMAS-PLAS-BAUB",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised shatterproof bauble",
    detail: "Your photo on a shatterproof tree bauble. Made in the UK via Prodigi.",
  },
  {
    id: "jf_alum_sq",
    slug: "personalised-aluminium-ornament",
    pricingSku: "XMAS-ALUM-SQ",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised aluminium ornament",
    detail: "Square aluminium tree ornament with your artwork.",
  },
  {
    id: "jf_glass_sq",
    slug: "personalised-glass-ornament",
    pricingSku: "XMAS-GLASS-SQ",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised glass ornament",
    detail: "Glass tree ornament with your portrait art.",
  },
  {
    id: "jf_porc_baub",
    slug: "personalised-ceramic-ornament",
    pricingSku: "XMAS-PORC-BAUB",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised ceramic ornament",
    detail: "Ceramic ornament with a glossy finish.",
  },
  {
    id: "jf_wood",
    slug: "personalised-wooden-ornament",
    pricingSku: "XMAS-WOOD",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised wooden ornament",
    detail: "Wooden tree ornament with your design.",
  },
  {
    id: "jf_stocking",
    slug: "personalised-christmas-stocking",
    pricingSku: "PF-716",
    cutoffKind: "printful_stocking" as JinglefoldCutoffKind,
    supplier: "printful" as const,
    name: "Personalised Christmas stocking",
    detail: "Printful UK fulfilment. Upload your photo for a cosy stocking.",
  },
  {
    id: "jf_plas_baub_3",
    slug: "personalised-bauble-trio",
    pricingSku: "XMAS-PLAS-BAUB-3",
    cutoffKind: "prodigi_bauble" as JinglefoldCutoffKind,
    supplier: "prodigi" as const,
    name: "Personalised bauble trio",
    detail: "Three matching shatterproof baubles. One design, three trees.",
  },
] as const;

export type JinglefoldPersonalisedId = (typeof JINGLEFOLD_PERSONALISED_PRODUCTS)[number]["id"];

export function jinglefoldPersonalisedBySlug(slug: string) {
  return JINGLEFOLD_PERSONALISED_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function jinglefoldPersonalisedById(id: string) {
  return JINGLEFOLD_PERSONALISED_PRODUCTS.find((p) => p.id === id) ?? null;
}

function personalisedTier(product: (typeof JINGLEFOLD_PERSONALISED_PRODUCTS)[number]): Tier {
  const sku = product.pricingSku;
  return {
    id: product.id,
    name: product.name,
    pricePence: recommendedPence("Christmas store", sku),
    compareAtPricePence: compareAtPence("Christmas store", sku),
    styleCount: 1,
    imageCount: 1,
    quality: "hd",
    includesCard: false,
    popular: product.id === "jf_plas_baub",
    blurb: product.detail,
    points: ["1 festive style", "Preview before you pay", "UK delivery in price"],
  };
}

export const JINGLEFOLD_PERSONALISED_TIERS: Tier[] = JINGLEFOLD_PERSONALISED_PRODUCTS.map(personalisedTier);

export const JINGLEFOLD_PERSONALISED_CONSENT =
  "This item is made to your specification (your photo and chosen design). Under the Consumer Contracts Regulations 2013, personalised goods are exempt from the 14-day cancellation right once production has started.";

export const JINGLEFOLD_CLP_BY_SKU: Record<string, string> = {
  "GEM-76735":
    "Scented candles. CLP hazard information: may cause an allergic skin reaction. Keep away from children and pets. Never leave a burning candle unattended. Dispose of contents/container in accordance with local regulations. See supplier label on the product for full UFI and hazard pictograms.",
};

export function jinglefoldShippingPence(subtotalPence: number) {
  return subtotalPence >= JINGLEFOLD_DELIVERY.freeDeliveryOverPence ? 0 : JINGLEFOLD_DELIVERY.standardDeliveryPence;
}

export function cutoffIsoForKind(cutoffs: JinglefoldCutoffs, kind: JinglefoldCutoffKind) {
  if (kind === "prodigi_bauble") return cutoffs.prodigiBaubleIso;
  if (kind === "printful_stocking") return cutoffs.printfulStockingIso;
  return cutoffs.goDropshipDecorIso;
}

export function isPastCutoff(cutoffIso: string, now = new Date()) {
  return now.getTime() > new Date(cutoffIso).getTime();
}
