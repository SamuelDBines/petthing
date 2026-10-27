export type EmailProviderId = "ses" | "resend" | "none";

export function awsSesRegion() {
  return (process.env.AWS_SES_REGION || "eu-west-2").trim();
}

export function emailProviderId(): EmailProviderId {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "resend") return "resend";
  if (explicit === "ses") return "ses";
  if (explicit === "none" || explicit === "log" || explicit === "outbox") return "none";
  if (process.env.AWS_SES_REGION?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim()) return "ses";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return "none";
}

export function sesCredentialsConfigured() {
  if (process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()) return true;
  return Boolean(process.env.AWS_SES_REGION?.trim());
}

export function parseFromHeader(from: string) {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: undefined, email: trimmed };
}

export function formatFromHeader(name: string, email: string) {
  const safeName = name.replace(/"/g, "'");
  return `${safeName} <${email}>`;
}

/** Global or per-store EMAIL_FROM_FIXMONGER override; otherwise brand emailFromName + global address. */
export async function resolveFromAddress(storeId?: string) {
  if (storeId) {
    const envKey = `EMAIL_FROM_${storeId.replace(/-/g, "_").toUpperCase()}`;
    const override = process.env[envKey]?.trim();
    if (override) return override;
    const global = process.env.EMAIL_FROM?.trim();
    if (!global) return null;
    const { email } = parseFromHeader(global);
    const { loadStoreConfig } = await import("@/lib/tenant/context");
    const config = await loadStoreConfig(storeId);
    return formatFromHeader(config.brand.emailFromName, email);
  }
  return process.env.EMAIL_FROM?.trim() ?? null;
}

export function replyToAddress() {
  return process.env.EMAIL_REPLY_TO?.trim() || undefined;
}

export function sesConfigurationSet() {
  return process.env.SES_CONFIGURATION_SET?.trim() || undefined;
}

export function isEmailStagingGateActive() {
  if (process.env.EMAIL_STAGING_GATE === "true") return true;
  if (process.env.EMAIL_STAGING_GATE === "false") return false;
  const admin = (process.env.ADMIN_URL || "").toLowerCase();
  if (admin.includes("bishop-co-tech.co.uk")) return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return false;
}

const DEFAULT_STAGING_ALLOW = ["samuelbines@gmail.com"];

export function stagingAllowsRecipient(to: string) {
  const norm = to.trim().toLowerCase();
  const extra = (process.env.EMAIL_STAGING_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const sink = process.env.EMAIL_TEST_SINK?.trim().toLowerCase();
  const allowed = new Set([...DEFAULT_STAGING_ALLOW, ...extra]);
  if (allowed.has(norm)) return true;
  if (sink && norm === sink) return true;
  if (norm.endsWith("@example.com") || norm.endsWith("@example.net")) return true;
  return false;
}

export function fromDomainForHealth() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return null;
  const { email } = parseFromHeader(from);
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : null;
}
