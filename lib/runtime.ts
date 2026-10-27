import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { REFERRAL_PREFIX } from "@/config/brand";

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function secret(name: string, devFallback: string) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production`);
  }
  return devFallback;
}

export function manualReviewEnabled() {
  return process.env.MANUAL_REVIEW !== "false";
}

export function maxDailySpendGbp() {
  const value = Number(process.env.MAX_DAILY_GEN_SPEND_GBP || "25");
  return Number.isFinite(value) && value > 0 ? value : 25;
}

export function usdToGbp(usd: number) {
  const fx = Number(process.env.USD_TO_GBP || "0.78");
  const rate = Number.isFinite(fx) && fx > 0 ? fx : 0.78;
  return Math.round(usd * rate * 10000) / 10000;
}

export function imageCostGbp() {
  const usd = Number(process.env.FAL_COST_USD_PER_IMAGE || "0.04");
  return usdToGbp(Number.isFinite(usd) ? usd : 0.04);
}

export function demoCheckoutAllowed() {
  if (process.env.STRIPE_SECRET_KEY) return false;
  if (process.env.ALLOW_DEMO_CHECKOUT === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_DEMO_CHECKOUT !== "false";
}

export function integrations() {
  return {
    postgres: Boolean(process.env.DATABASE_URL),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    fal: Boolean(process.env.FAL_KEY),
    resend: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    prodigi: Boolean(process.env.PRODIGI_API_KEY),
    metaPixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    tiktokPixel: Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
    manualReview: manualReviewEnabled(),
    demoCheckout: demoCheckoutAllowed(),
  };
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function referralCode(prefix = REFERRAL_PREFIX) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `${prefix}-${body}`;
}

export function integrationIdentifier(flow: string) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(8);
  let suffix = "";
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `pawtraitry_${flow}_${suffix}`;
}

export function signValue(value: string, secretName: string, fallback: string) {
  return createHmac("sha256", secret(secretName, fallback)).update(value).digest("base64url");
}

export function londonDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export function hashIp(ip: string) {
  return createHmac("sha256", secret("IP_HASH_SALT", "dev-ip-salt")).update(ip).digest("hex");
}

export function assertCron(request: Request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRON_SECRET is required in production");
    }
    return;
  }
  const header = request.headers.get("authorization");
  if (!safeEqual(header || "", `Bearer ${configured}`)) {
    throw new Error("Unauthorised");
  }
}
