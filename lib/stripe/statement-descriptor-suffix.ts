import type { StoreBrand } from "@/lib/tenant/types";

const DISALLOWED = /[<>'"\\*]/g;

/** Latin letters, digits, and spaces only (Stripe statement descriptor rules). */
const NON_LATIN = /[^A-Za-z0-9 ]+/g;

export function statementDescriptorSuffixForBrand(brand: StoreBrand): string | undefined {
  const raw = brand.statementDescriptorSuffix ?? brand.stripeStatementDescriptorSuffix;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function sanitizeStatementDescriptorSuffix(raw: string, accountPrefix = ""): string {
  let value = raw.normalize("NFKD").replace(/\p{M}/gu, "");
  value = value.replace(DISALLOWED, "").replace(NON_LATIN, "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  const maxLen = maxStatementDescriptorSuffixLength(accountPrefix);
  if (maxLen <= 0) return "";
  return value.slice(0, maxLen);
}

/** Prefix + "* " + suffix must fit in 22 characters on the card statement. */
export function maxStatementDescriptorSuffixLength(accountPrefix: string) {
  const prefix = accountPrefix.trim();
  return Math.max(0, 22 - prefix.length - 2);
}

export function accountStatementDescriptorPrefix(env: NodeJS.ProcessEnv = process.env) {
  return env.STRIPE_STATEMENT_DESCRIPTOR_PREFIX?.trim() ?? "";
}

export function paymentIntentDescriptorSuffixForBrand(
  brand: StoreBrand,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const configured = statementDescriptorSuffixForBrand(brand);
  if (!configured) return undefined;
  const sanitized = sanitizeStatementDescriptorSuffix(configured, accountStatementDescriptorPrefix(env));
  return sanitized || undefined;
}

export function isStatementDescriptorSuffixStripeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const stripe = error as { param?: string; message?: string; code?: string };
  if (stripe.param?.includes("statement_descriptor")) return true;
  const msg = (stripe.message ?? "").toLowerCase();
  return msg.includes("statement_descriptor") || msg.includes("statement descriptor");
}
