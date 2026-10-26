import { FOOTER_TRADING_DISCLOSURE, LEGAL_COMPANY_NAME, LEGAL_COMPANY_NUMBER, LEGAL_REGISTERED_OFFICE } from "@/config/brand";
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

const wildframeColors: StoreThemeColors = {
  ink: "#eef4ef",
  cream: "#14231a",
  pumpkin: "#2d5a3d",
  gold: "#8a6f4e",
  moss: "#c8dcc8",
  bark: "#f7faf7",
  line: "#a8b8a8",
};

function disclosure(tradingName: string) {
  return `${tradingName} is a trading name of ${LEGAL_COMPANY_NAME}, registered in England and Wales, company no. ${LEGAL_COMPANY_NUMBER}, registered office ${LEGAL_REGISTERED_OFFICE}.`;
}

const WILDFRAME_THEMES: typeof THEMES = [
  {
    id: "evergreen",
    name: "Evergreen",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    deadlineIso: "2026-12-31T23:59:00.000Z",
    deadlineLabel: "Delivered within a few days",
    heroTitle: "Your pet, painted like a national-park poster.",
    heroBody:
      "Send a few clear photos. We turn dogs and cats into bold watercolour trail scenes — misty pines, canyon light, and a recognisable face in every frame.",
    styles: [
      {
        id: "pine-mist",
        name: "Pine mist morning",
        blurb: "Cool greens, soft fog, and a quiet forest path.",
        thumbnail: "",
        swatch: "#3d5c4a",
      },
      {
        id: "canyon-glow",
        name: "Canyon glow",
        blurb: "Warm sandstone light and a wide desert sky.",
        thumbnail: "",
        swatch: "#c46a3a",
      },
      {
        id: "lake-reflection",
        name: "Lake reflection",
        blurb: "Still water, distant peaks, and a patient pose.",
        thumbnail: "",
        swatch: "#4a6d8c",
      },
      {
        id: "meadow-wildflowers",
        name: "Meadow wildflowers",
        blurb: "Summer colour, soft brushstrokes, open grass.",
        thumbnail: "",
        swatch: "#7a9e5a",
      },
      {
        id: "trail-companion",
        name: "Trail companion",
        blurb: "Backpack, boots, and your pet leading the way.",
        thumbnail: "",
        swatch: "#5c4a38",
      },
      {
        id: "starlit-ridge",
        name: "Starlit ridge",
        blurb: "Twilight blues and a cosy bandana glow.",
        thumbnail: "",
        swatch: "#2a3d5c",
      },
    ],
  },
];

export const DEFAULT_STORE_ID = "pawtraitry";

export const BUILTIN_STORES: StoreConfig[] = [
  {
    id: "pawtraitry",
    slug: "pawtraitry",
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
      tiers: TIERS,
      priorityPence: PRIORITY_PENCE,
      extraStylesPence: EXTRA_STYLES_PENCE,
      christmasPreorderPence: CHRISTMAS_PREORDER_PENCE,
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
    id: "wildframe",
    slug: "wildframe",
    domains: ["wildframe.studio", "www.wildframe.studio", "wildframe.localhost"],
    brand: {
      appName: "WildFrame",
      tagline: "National-park watercolours of the pets who hike with you.",
      siteDomain: "wildframe.studio",
      supportEmail: "hello@wildframe.studio",
      legalTradingName: "WildFrame",
      footerTradingDisclosure: disclosure("WildFrame"),
      emailFromName: "WildFrame",
      stripeStatementDescriptor: "WILDFRAME",
      referralPrefix: "WLD",
      logoPath: "/stores/wildframe-logo.svg",
      colors: wildframeColors,
    },
    themes: WILDFRAME_THEMES,
    catalog: {
      tiers: TIERS.map((tier) =>
        tier.id === "mini" ? { ...tier, pricePence: 649, blurb: "One trail scene, two images." } : tier,
      ),
      priorityPence: PRIORITY_PENCE,
      extraStylesPence: EXTRA_STYLES_PENCE,
      christmasPreorderPence: CHRISTMAS_PREORDER_PENCE,
    },
    settings: {
      themeMode: "manual",
      activeThemeId: "evergreen",
      salesPaused: false,
      queueHalted: false,
      haltReason: null,
      haltNotifiedOn: null,
    },
    integrations: {
      maxDailyGenSpendGbp: 15,
      prodigiEnv: "sandbox",
      stylePresetIds: ["pine-mist", "canyon-glow", "lake-reflection"],
      social: {},
    },
  },
];

export function builtinStore(id: string) {
  return BUILTIN_STORES.find((store) => store.id === id || store.slug === id) ?? null;
}
