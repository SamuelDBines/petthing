import { FOOTER_TRADING_DISCLOSURE, LEGAL_COMPANY_NAME, LEGAL_COMPANY_NUMBER, LEGAL_REGISTERED_OFFICE } from "@/config/brand";
import { DEFAULT_DUTIES_DISCLAIMER, DEFAULT_PAINTING_CUTOFFS, HAND_PAINTED_TIERS } from "@/config/paintings";
import { CHRISTMAS_PREORDER_PENCE, EXTRA_STYLES_PENCE, PRIORITY_PENCE, TIERS } from "@/config/pricing";
import { THEMES } from "@/config/themes";
import type { StoreConfig, StoreThemeColors } from "@/lib/tenant/types";

const pawtraitryColors: StoreThemeColors = {
  ink: "#f3efe8",
  cream: "#1c1916",
  pumpkin: "#1c1916",
  gold: "#6b6258",
  moss: "#e7e1d8",
  bark: "#fbf9f5",
  line: "#c4b9ac",
};

const fixmongerColors: StoreThemeColors = {
  ink: "#1a1a1a",
  cream: "#fff9f0",
  pumpkin: "#c45c26",
  gold: "#f0b429",
  moss: "#4a6741",
  bark: "#faf6ef",
  line: "#d4c4a8",
};

function disclosure(tradingName: string) {
  return `${tradingName} is a trading name of ${LEGAL_COMPANY_NAME}, registered in England and Wales, company no. ${LEGAL_COMPANY_NUMBER}, registered office ${LEGAL_REGISTERED_OFFICE}.`;
}

const FIXMONGER_THEME: typeof THEMES = [
  {
    id: "fixmonger-core",
    name: "Fixmonger",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    deadlineIso: "2026-12-31T23:59:00.000Z",
    deadlineLabel: "Free UK delivery",
    heroTitle: "Cheap fixes for proper British weather.",
    heroBody:
      "Frost covers, draught excluders, and the other sensible bits your shed should have had years ago. No electric. No nonsense.",
    styles: [],
  },
];

export const DEFAULT_STORE_ID = "pawtraitry";

export const BUILTIN_STORES: StoreConfig[] = [
  {
    id: "pawtraitry",
    slug: "pawtraitry",
    storeType: "portrait",
    domains: ["pawtraitry.co.uk", "www.pawtraitry.co.uk", "pawtraitry.localhost", "localhost"],
    brand: {
      appName: "Pawtraitry",
      tagline:
        "Premium AI pet portraits from your photos — a thoughtful gift for cat and dog lovers, all year round.",
      siteDomain: "pawtraitry.co.uk",
      supportEmail: "hello@pawtraitry.co.uk",
      legalTradingName: "Pawtraitry",
      footerTradingDisclosure: FOOTER_TRADING_DISCLOSURE,
      emailFromName: "Pawtraitry",
      stripeStatementDescriptor: "PAWTRAITRY",
      referralPrefix: "PAW",
      logoPath: "/logo.svg",
      colors: pawtraitryColors,
    },
    themes: THEMES,
    catalog: {
      tiers: [...TIERS, ...HAND_PAINTED_TIERS],
      priorityPence: PRIORITY_PENCE,
      extraStylesPence: EXTRA_STYLES_PENCE,
      christmasPreorderPence: CHRISTMAS_PREORDER_PENCE,
      painting: {
        cutoffs: DEFAULT_PAINTING_CUTOFFS,
        dutiesDisclaimer: DEFAULT_DUTIES_DISCLAIMER,
      },
    },
    settings: {
      themeMode: "auto",
      activeThemeId: "halloween",
      salesPaused: false,
      queueHalted: false,
      haltReason: null,
      haltNotifiedOn: null,
    },
    integrations: {
      maxDailyGenSpendGbp: 25,
      prodigiEnv: "sandbox",
      stylePresetIds: ["victorian-portrait", "pumpkin-dusk", "storybook"],
      social: {},
    },
  },
  {
    id: "fixmonger",
    slug: "fixmonger",
    storeType: "catalogue",
    domains: [
      "fixmonger.co.uk",
      "www.fixmonger.co.uk",
      "fixmonger.com",
      "www.fixmonger.com",
      "fixmonger.localhost",
      "wildframe.localhost",
      "wildframe.studio",
      "www.wildframe.studio",
    ],
    brand: {
      appName: "Fixmonger",
      tagline: "Sensible fixes for British weather — frost covers, draught kits, and shed essentials.",
      siteDomain: "fixmonger.co.uk",
      supportEmail: "hello@fixmonger.co.uk",
      legalTradingName: "Fixmonger",
      footerTradingDisclosure: disclosure("Fixmonger"),
      emailFromName: "Fixmonger",
      stripeStatementDescriptor: "FIXMONGER",
      referralPrefix: "FIX",
      logoPath: "/stores/fixmonger-logo.svg",
      colors: fixmongerColors,
    },
    themes: FIXMONGER_THEME,
    catalog: {
      tiers: [],
      priorityPence: 0,
      extraStylesPence: 0,
      christmasPreorderPence: 0,
      freeUkShipping: false,
    },
    settings: {
      themeMode: "manual",
      activeThemeId: "fixmonger-core",
      salesPaused: false,
      queueHalted: false,
      haltReason: null,
      haltNotifiedOn: null,
    },
    integrations: {
      maxDailyGenSpendGbp: 0,
      prodigiEnv: "sandbox",
      stylePresetIds: [],
      social: {},
    },
  },
];

export function builtinStore(id: string) {
  const normalized = id === "wildframe" ? "fixmonger" : id;
  return BUILTIN_STORES.find((store) => store.id === normalized || store.slug === normalized) ?? null;
}
