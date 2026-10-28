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
  /** Secondary body copy — must meet WCAG AA on `ink` and `bark`. */
  muted: string;
  bark: string;
  line: string;
};

export type StoreBrandEmail = {
  domain: string;
  ordersLocal?: string;
  helloLocal?: string;
  fromName?: string;
  /** Prefix From name when sending from a shared verified domain. */
  placeholderSender?: boolean;
};

export type StoreBrand = {
  appName: string;
  tagline: string;
  siteDomain: string;
  supportEmail: string;
  legalTradingName: string;
  footerTradingDisclosure: string;
  emailFromName: string;
  email?: StoreBrandEmail;
  stripeStatementDescriptor: string;
  /** Stripe Checkout payment_intent_data.statement_descriptor_suffix (max 22 chars). */
  stripeStatementDescriptorSuffix?: string;
  referralPrefix: string;
  logoPath: string;
  ogImagePath?: string;
  faviconPath?: string;
  colors: StoreThemeColors;
  /** Optional Meta ads config (env META_*_<STORE> overrides). */
  meta?: {
    pixelId?: string;
    domainVerification?: string;
  };
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
