import {
  formatFromHeader,
  parseFromHeader,
} from "@/lib/email/from-header";
import type { EmailFromRole } from "@/lib/email/types";
import type { StoreBrandEmail } from "@/lib/tenant/types";

function envKeyForStore(storeId: string, suffix: string) {
  return `${suffix}_${storeId.replace(/-/g, "_").toUpperCase()}`;
}

function fromBrandEmail(brandEmail: StoreBrandEmail, appName: string, role: EmailFromRole) {
  const local = role === "hello" ? (brandEmail.helloLocal ?? "hello") : (brandEmail.ordersLocal ?? "orders");
  const baseName = brandEmail.fromName ?? appName;
  const name = brandEmail.placeholderSender ? `${baseName} (placeholder sender)` : baseName;
  return formatFromHeader(name, `${local}@${brandEmail.domain}`);
}

/** Resolve transactional (orders@) or marketing (hello@) From header for a store. */
export async function resolveFromAddress(storeId?: string, role: EmailFromRole = "orders") {
  if (storeId) {
    const overrideKey =
      role === "hello" ? envKeyForStore(storeId, "EMAIL_FROM_HELLO") : envKeyForStore(storeId, "EMAIL_FROM");
    const override = process.env[overrideKey]?.trim();
    if (override) return override;

    const { loadStoreConfig } = await import("@/lib/tenant/context");
    const config = await loadStoreConfig(storeId);
    if (config.brand.email?.domain) {
      return fromBrandEmail(config.brand.email, config.brand.appName, role);
    }

    const global = process.env.EMAIL_FROM?.trim();
    if (!global) return null;
    const { email } = parseFromHeader(global);
    return formatFromHeader(config.brand.emailFromName, email);
  }
  return process.env.EMAIL_FROM?.trim() ?? null;
}

export async function resolveReplyToAddress(storeId?: string) {
  if (storeId) {
    const key = envKeyForStore(storeId, "EMAIL_REPLY_TO");
    const override = process.env[key]?.trim();
    if (override) return override;

    const { loadStoreConfig } = await import("@/lib/tenant/context");
    const config = await loadStoreConfig(storeId);
    if (config.brand.email?.domain) {
      const hello = config.brand.email.helloLocal ?? "hello";
      return `${hello}@${config.brand.email.domain}`;
    }
  }
  return process.env.EMAIL_REPLY_TO?.trim() || undefined;
}
