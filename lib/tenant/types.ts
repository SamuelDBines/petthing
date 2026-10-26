import type { PaintingCutoffs } from "@/config/paintings";
import type { Tier } from "@/config/pricing";
import type { ThemeDefinition } from "@/config/themes";
import type { Settings } from "@/lib/domain";

export type StoreType = "portrait" | "catalogue" | "christmas";

export type StoreThemeColors = {
  ink: string;
  cream: string;
  pumpkin: string;
  gold: string;
  moss: string;
  bark: string;
  line: string;
};

export type StoreBrand = {
  appName: string;
  tagline: string;
  siteDomain: string;
  supportEmail: string;
  legalTradingName: string;
  footerTradingDisclosure: string;
  emailFromName: string;
  stripeStatementDescriptor: string;
  referralPrefix: string;
  logoPath: string;
  ogImagePath?: string;
  faviconPath?: string;
  colors: StoreThemeColors;
};

export type StoreCatalog = {
  tiers: Tier[];
  priorityPence: number;
  extraStylesPence: number;
  christmasPreorderPence: number;
  /** Pawtraitry painted canvas + hand-painted messaging */
  painting?: {
    cutoffs: PaintingCutoffs;
    dutiesDisclaimer: string;
    freeUkShippingPence?: number;
  };
  /** Catalogue stores */
  freeUkShipping?: boolean;
  jinglefold?: {
    cutoffs: import("@/config/jinglefold").JinglefoldCutoffs;
  };
  pawtraitryPromos?: import("@/config/pawtraitry-promos").PawtraitryPromoSettings;
};

export type StoreIntegrations = {
  maxDailyGenSpendGbp: number;
  prodigiEnv: "sandbox" | "live";
  stylePresetIds: string[];
  social: {
    youtube?: string;
    instagram?: string;
    pinterest?: string;
    tiktok?: string;
    x?: string;
  };
};

export type StoreConfig = {
  id: string;
  slug: string;
  storeType: StoreType;
  domains: string[];
  brand: StoreBrand;
  themes: ThemeDefinition[];
  catalog: StoreCatalog;
  settings: Settings;
  integrations: StoreIntegrations;
};

export type StoreRow = {
  id: string;
  slug: string;
  domains: string[];
  config: StoreConfig;
  createdAt: string;
};
