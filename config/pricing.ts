export type TierId = "mini" | "classic" | "deluxe" | "hand_painted_12x16" | "hand_painted_16x20";
export type Quality = "standard" | "hd";

export type Tier = {
  id: TierId;
  name: string;
  pricePence: number;
  styleCount: number | "all";
  imageCount: number;
  quality: Quality;
  includesCard: boolean;
  popular: boolean;
  blurb: string;
  points: string[];
};

export const TIERS: Tier[] = [
  {
    id: "mini",
    name: "Mini",
    pricePence: 599,
    styleCount: 1,
    imageCount: 2,
    quality: "standard",
    includesCard: false,
    popular: false,
    blurb: "A first look, from one style.",
    points: ["1 style", "2 images", "Standard resolution"],
  },
  {
    id: "classic",
    name: "Classic",
    pricePence: 1099,
    styleCount: 2,
    imageCount: 6,
    quality: "hd",
    includesCard: false,
    popular: true,
    blurb: "The set most people send to the family chat.",
    points: ["2 styles", "6 images", "HD"],
  },
  {
    id: "deluxe",
    name: "Deluxe",
    pricePence: 1599,
    styleCount: "all",
    imageCount: 12,
    quality: "hd",
    includesCard: true,
    popular: false,
    blurb: "Every style, plus a card you can print tonight.",
    points: ["All styles", "12 images", "HD", "Printable card builder"],
  },
];

export const PRIORITY_PENCE = 299;
export const EXTRA_STYLES_PENCE = 499;
export const EXTRA_STYLES_COUNT = 3;
export const EXTRA_IMAGES_PER_STYLE = 2;
export const CHRISTMAS_PREORDER_PENCE = 799;

/** Yearly family portraits. One Classic set for each season that is on sale. Change the price here. */
export const SEASON_PASS = {
  id: "season_pass" as const,
  name: "Season pass",
  pricePence: 2999,
  interval: "year" as const,
  subject: "family" as const,
  tierId: "classic" as const,
  blurb: "A family set every season, billed once a year.",
  points: ["Family or group", "A Classic set each season", "Current season now, Christmas next", "Photos kept for the next season"],
};
export const REFERRAL_DISCOUNT = 0.2;

export function formatGbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function getTier(id: TierId, extraTiers: Tier[] = []) {
  const tier = [...TIERS, ...extraTiers].find((item) => item.id === id);
  if (!tier) throw new Error("Unknown tier");
  return tier;
}

export function styleSlots(tier: Tier, themeStyleCount: number) {
  return tier.styleCount === "all" ? themeStyleCount : tier.styleCount;
}

/** How many images each selected style receives. Remainder goes to the first styles. */
export function perStyleCounts(imageCount: number, styleCount: number) {
  if (styleCount < 1) throw new Error("Choose at least one style");
  const base = Math.floor(imageCount / styleCount);
  if (base < 1) throw new Error("That tier does not cover this many styles");
  const extra = imageCount % styleCount;
  return Array.from({ length: styleCount }, (_, index) => base + (index < extra ? 1 : 0));
}

export function discountedPence(pricePence: number, discountRate: number) {
  return Math.max(50, Math.round(pricePence * (1 - discountRate)));
}
