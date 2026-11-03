import { createHash } from "crypto";

const BOT_UA =
  /bot|crawler|spider|crawl|slurp|mediapartners|facebookexternalhit|bingpreview|duckduckbot|yandex|baiduspider|semrush|ahrefs|petalbot|gptbot|claudebot|bytespider/i;
const HEADLESS_UA = /HeadlessChrome|Playwright|python-requests|^curl\/|Wget\/|httpie|axios\/|node-fetch/i;

export type TrafficExclusionReason = "bot" | "headless" | "internal_probe" | "admin" | "manual_exclude";

export function hashIpForAllowlist(ip: string) {
  return createHash("sha256").update(`analytics-internal:${ip}`).digest("hex");
}

export function internalIpAllowed(ip: string) {
  const raw = process.env.ANALYTICS_INTERNAL_IP_HASHES;
  if (!raw?.trim()) return false;
  const hash = hashIpForAllowlist(ip);
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .includes(hash);
}

export function classifyTraffic(args: {
  userAgent?: string | null;
  internalCheckHeader?: string | null;
  ip?: string | null;
  excludeCookie?: boolean;
  isAdmin?: boolean;
}): { excluded: boolean; reason: TrafficExclusionReason | null } {
  if (args.excludeCookie) return { excluded: true, reason: "manual_exclude" };
  if (args.isAdmin) return { excluded: true, reason: "admin" };
  if (args.internalCheckHeader === "1" || args.internalCheckHeader?.toLowerCase() === "true") {
    return { excluded: true, reason: "internal_probe" };
  }
  if (args.ip && internalIpAllowed(args.ip)) return { excluded: true, reason: "internal_probe" };
  const ua = args.userAgent ?? "";
  if (HEADLESS_UA.test(ua)) return { excluded: true, reason: "headless" };
  if (BOT_UA.test(ua)) return { excluded: true, reason: "bot" };
  return { excluded: false, reason: null };
}

export function referrerDomain(referrer?: string | null) {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.slice(0, 200) || "direct";
  } catch {
    return referrer.slice(0, 200);
  }
}

export function browserFromUserAgent(userAgent?: string | null) {
  if (!userAgent) return "unknown";
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "other";
}

export function paidClickIds(searchOrUtm: Record<string, string | undefined>) {
  return {
    gclid: searchOrUtm.gclid,
    fbclid: searchOrUtm.fbclid,
    ttclid: searchOrUtm.ttclid,
  };
}

export function isPaidTraffic(args: { gclid?: string | null; fbclid?: string | null; ttclid?: string | null; utmMedium?: string | null }) {
  if (args.gclid || args.fbclid || args.ttclid) return true;
  const medium = (args.utmMedium ?? "").toLowerCase();
  return medium === "cpc" || medium === "paid" || medium === "ppc" || medium === "paid_social";
}
