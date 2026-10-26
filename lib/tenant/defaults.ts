import { FOOTER_TRADING_DISCLOSURE, LEGAL_COMPANY_NAME, LEGAL_COMPANY_NUMBER, LEGAL_REGISTERED_OFFICE } from "@/config/brand";
import { DEFAULT_DUTIES_DISCLAIMER, DEFAULT_PAINTING_CUTOFFS, HAND_PAINTED_TIERS } from "@/config/paintings";
import { DEFAULT_JINGLEFOLD_CUTOFFS, JINGLEFOLD_PERSONALISED_TIERS } from "@/config/jinglefold";
import { DEFAULT_PAWTRAITRY_PROMOS } from "@/config/pawtraitry-promos";
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

const jinglefoldColors: StoreThemeColors = {
  ink: "#fff8f0",
  cream: "#3b1414",
  pumpkin: "#9b1c1c",
  gold: "#c9a227",
  moss: "#1f4d3a",
  bark: "#fffdf8",
  line: "#e8d5c4",
};

const fixmongerColors: StoreThemeColors = {
  ink: "#f7f4ee",
  cream: "#1a2e1f",
  pumpkin: "#e85d04",
  gold: "#c9a227",
  moss: "#3d5a40",
  bark: "#ffffff",
  line: "#d4cfc4",
};

function disclosure(tradingName: string) {
  return `${tradingName} is a trading name of ${LEGAL_COMPANY_NAME}, registered in England and Wales, company no. ${LEGAL_COMPANY_NUMBER}, registered office ${LEGAL_REGISTERED_OFFICE}.`;
}

const JINGLEFOLD_THEME: typeof THEMES = [
  {
    id: "jinglefold-core",
    name: "Jinglefold",
    startsOn: "2026-11-01",
    endsOn: "2026-12-31",
    deadlineIso: "2026-12-14T23:59:00.000Z",
    deadlineLabel: "Order by 14 Dec for UK decor delivery",
    heroTitle: "Personalised Christmas, folded into your home.",
    heroBody: "Tasteful ornaments from your photos, plus ready-made decor shipped from UK stock.",
    styles: [
      {
        id: "cosy-classic",
        name: "Cosy classic",
        blurb: "Warm candlelight and muted reds — elegant, not loud.",
        thumbnail: "",
        swatch: "#8b3a3a",
      },
      {
        id: "snow-globe",
        name: "Snow globe",
        blurb: "Soft snowfall and gentle greens.",
        thumbnail: "",
        swatch: "#4a6741",
      },
      {
        id: "hearthside",
        name: "Hearthside",
        blurb: "Fireside glow with a tasteful wreath.",
        thumbnail: "",
        swatch: "#c9a227",
      },
    ],
  },
];

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
      pawtraitryPromos: DEFAULT_PAWTRAITRY_PROMOS,
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
      ogImagePath: "/stores/fixmonger/og.jpg",
      faviconPath: "/stores/fixmonger-favicon.svg",
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
  {
    id: "jinglefold",
    slug: "jinglefold",
    storeType: "christmas",
    domains: ["jinglefold.co.uk", "www.jinglefold.co.uk", "jinglefold.localhost"],
    brand: {
      appName: "Jinglefold",
      tagline: "Personalised Christmas, folded into your home.",
      siteDomain: "jinglefold.co.uk",
      supportEmail: "hello@jinglefold.co.uk",
      legalTradingName: "Jinglefold",
      footerTradingDisclosure: disclosure("Jinglefold"),
      emailFromName: "Jinglefold",
      stripeStatementDescriptor: "JINGLEFOLD",
      referralPrefix: "JIN",
      logoPath: "/stores/jinglefold-logo.svg",
      ogImagePath: "/stores/jinglefold/og.jpg",
      faviconPath: "/stores/jinglefold-favicon.svg",
      colors: jinglefoldColors,
    },
    themes: JINGLEFOLD_THEME,
    catalog: {
      tiers: JINGLEFOLD_PERSONALISED_TIERS,
      priorityPence: 0,
      extraStylesPence: 0,
      christmasPreorderPence: 0,
      freeUkShipping: false,
      jinglefold: { cutoffs: DEFAULT_JINGLEFOLD_CUTOFFS },
    },
    settings: {
      themeMode: "manual",
      activeThemeId: "jinglefold-core",
      salesPaused: false,
      queueHalted: false,
      haltReason: null,
      haltNotifiedOn: null,
    },
    integrations: {
      maxDailyGenSpendGbp: 15,
      prodigiEnv: "sandbox",
      stylePresetIds: ["cosy-classic", "snow-globe", "hearthside"],
      social: {},
    },
  },
];

export function builtinStore(id: string) {
  const normalized = id === "wildframe" ? "fixmonger" : id;
  return BUILTIN_STORES.find((store) => store.id === normalized || store.slug === normalized) ?? null;
}
