/** Customer-facing brand. Override with env before domains are registered. */
const trim = (value: string | undefined) => value?.trim() || "";

export const APP_NAME = trim(process.env.NEXT_PUBLIC_APP_NAME) || "Pawtraitry";

export const SITE_DOMAIN = trim(process.env.NEXT_PUBLIC_SITE_DOMAIN) || "pawtraitry.co.uk";

export const TAGLINE =
  "Premium AI pet portraits from your photos — a thoughtful gift for cat and dog lovers, all year round.";

export const SUPPORT_EMAIL = trim(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) || `hello@${SITE_DOMAIN}`;

export const LEGAL_TRADING_NAME = APP_NAME;
export const LEGAL_COMPANY_NAME = "Bishop Co Tech Limited";
export const LEGAL_COMPANY_NUMBER = "16240322";
export const LEGAL_REGISTERED_OFFICE = "14 Riverside Walk, Ashford TN23 4AR";

export const FOOTER_TRADING_DISCLOSURE =
  `${LEGAL_TRADING_NAME} is a trading name of ${LEGAL_COMPANY_NAME}, registered in England and Wales, company no. ${LEGAL_COMPANY_NUMBER}, registered office ${LEGAL_REGISTERED_OFFICE}.`;

export const AI_GENERATED_LABEL =
  "AI-generated portrait styled from your photos. Not a photograph.";

export const PHOTO_CONSENT_LABEL =
  "I own these photos or have permission from everyone shown, including a parent or guardian for any children.";

export const DIGITAL_SUPPLY_CONSENT_LABEL =
  "I agree to immediate supply of the digital portraits by email and download link, and I understand I will lose my 14-day right to cancel once delivery begins (Consumer Contracts Regulations 2013, regulation 37).";

/** @deprecated Use PHOTO_CONSENT_LABEL */
export const CONSENT_LABEL = PHOTO_CONSENT_LABEL;

export const REFERRAL_PREFIX = trim(process.env.REFERRAL_CODE_PREFIX) || "PAW";

export function siteUrl() {
  const configured = trim(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return `https://${SITE_DOMAIN}`;
  return "http://localhost:3000";
}

export function emailFromDisplayName() {
  return APP_NAME;
}
