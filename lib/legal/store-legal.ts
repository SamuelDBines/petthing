import {
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_NUMBER,
  LEGAL_REGISTERED_OFFICE,
} from "@/config/brand";
import { supportEmailForStore } from "@/lib/tenant/support-email";
import type { StoreConfig } from "@/lib/tenant/types";

export type LegalCopy = {
  appName: string;
  tradingName: string;
  supportEmail: string;
  productKind: "digital_portraits" | "physical_decor" | "physical_tools";
  shippingNotes: string;
  personalisedExempt: boolean;
  personalisedReturnsText: string | null;
};

export function legalCopyForStore(config: StoreConfig): LegalCopy {
  const appName = config.brand.appName;
  const tradingName = config.brand.legalTradingName;
  const supportEmail = supportEmailForStore(config.id, {
    domains: config.domains,
    brandFallback: config.brand.supportEmail,
  });
  if (config.id === "fixmonger") {
    return {
      appName,
      tradingName,
      supportEmail,
      productKind: "physical_tools",
      personalisedExempt: false,
      personalisedReturnsText: null,
      shippingNotes:
        "Fixmonger orders are fulfilled by Go Dropship (UK warehouse). Standard UK delivery is typically 3–7 working days after dispatch. Tracking is emailed when available.",
    };
  }
  if (config.id === "jinglefold") {
    return {
      appName,
      tradingName,
      supportEmail,
      productKind: "physical_decor",
      personalisedExempt: true,
      personalisedReturnsText:
        "Personalised Jinglefold baubles and ornaments made from your photos are bespoke. You lose the 14-day cancellation right once production begins, but faulty or misdescribed personalised items are covered by your statutory rights. Non-personalised ready-made decor can be returned within 14 days of delivery under the rules above.",
      shippingNotes:
        "Ready-made decor ships from UK stock via Go Dropship (typically 3–7 working days). Personalised Christmas baubles and portrait ornaments are printed by Prodigi (typically 5–10 working days to UK addresses).",
    };
  }
  return {
    appName,
    tradingName,
    supportEmail,
    productKind: "digital_portraits",
    personalisedExempt: true,
    personalisedReturnsText:
      "Personalised Pawtraitry portraits and printed goods made to your photos are bespoke. You lose the 14-day cancellation right once production or digital delivery begins, but faulty or misdescribed items are covered by your statutory rights.",
    shippingNotes:
      "Digital portraits are delivered by email and private download link. Optional printed gifts (framed prints, canvases, mugs and puzzles) are made and shipped by our print partner Prodigi (typically 5–10 working days in the UK).",
  };
}

export function legalWhoWeAre(copy: LegalCopy) {
  return `${copy.tradingName} (${copy.appName}) is a trading name of ${LEGAL_COMPANY_NAME}, a company registered in England and Wales (company number ${LEGAL_COMPANY_NUMBER}), whose registered office is ${LEGAL_REGISTERED_OFFICE}. Contact: ${copy.supportEmail}.`;
}
