import { isStoreLive } from "@/lib/go-live/live-stores";
import { requestHostIsStaging, storeLiveOnCanonicalHost } from "@/lib/go-live/store-host-live";

export type EmailGateContext = {
  storeId?: string;
  requestHost?: string | null;
  stripeLivemode?: boolean | null;
};

/** When true, outbound mail to non-allowlisted recipients is blocked (outbox only). */
export function emailStagingGateApplies(ctx: EmailGateContext, env: NodeJS.ProcessEnv = process.env): boolean {
  const host = ctx.requestHost?.trim() || "";
  if (host && requestHostIsStaging(host)) return true;

  if (ctx.storeId && host && storeLiveOnCanonicalHost(ctx.storeId, host, env)) {
    return false;
  }

  if (ctx.stripeLivemode === true) return false;
  if (ctx.stripeLivemode === false) return true;

  if (ctx.storeId) {
    return true;
  }

  if (env.EMAIL_STAGING_GATE === "true") return true;
  if (env.EMAIL_STAGING_GATE === "false") return false;
  if (env.VERCEL_ENV === "preview") return true;
  return false;
}

export function isEmailStagingGateActive(ctx: EmailGateContext = {}, env: NodeJS.ProcessEnv = process.env) {
  return emailStagingGateApplies(ctx, env);
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
