import { randomUUID } from "crypto";
import { getSql } from "@/lib/db/client";
import type { EmailSignupRow } from "@/lib/crm/merge-persons";
import { normalizeEmail } from "@/lib/crm/merge-persons";
import type { SignupSource } from "@/lib/crm/types";

function rowFromDb(row: Record<string, unknown>): EmailSignupRow {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    email: String(row.email),
    source: String(row.source) as SignupSource,
    name: row.name ? String(row.name) : null,
    marketingConsent: Boolean(row.marketing_consent),
    marketingConsentAt: row.marketing_consent_at ? new Date(row.marketing_consent_at as string).toISOString() : null,
    utmSource: row.utm_source ? String(row.utm_source) : null,
    utmMedium: row.utm_medium ? String(row.utm_medium) : null,
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : null,
    referrer: row.referrer ? String(row.referrer) : null,
    excludedFromMetrics: Boolean(row.excluded_from_metrics),
    unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function insertEmailSignup(args: {
  storeId: string;
  email: string;
  source: SignupSource;
  name?: string | null;
  marketingConsent?: boolean;
  utm?: Record<string, string>;
  referrer?: string | null;
  visitorSessionId?: string | null;
  excludedFromMetrics?: boolean;
}) {
  if (!process.env.DATABASE_URL) return null;
  const sql = getSql();
  const email = normalizeEmail(args.email);
  const id = randomUUID();
  const consentAt = args.marketingConsent ? sql`now()` : null;
  await sql`
    insert into email_signups (
      id, store_id, email, source, name, marketing_consent, marketing_consent_at,
      utm_source, utm_medium, utm_campaign, referrer, visitor_session_id, excluded_from_metrics, created_at
    ) values (
      ${id}::uuid,
      ${args.storeId},
      ${email},
      ${args.source},
      ${args.name ?? null},
      ${Boolean(args.marketingConsent)},
      ${consentAt},
      ${args.utm?.utm_source ?? null},
      ${args.utm?.utm_medium ?? null},
      ${args.utm?.utm_campaign ?? null},
      ${args.referrer ?? null},
      ${args.visitorSessionId ?? null},
      ${Boolean(args.excludedFromMetrics)},
      now()
    )
  `;
  return id;
}

export async function listEmailSignups(storeId?: string | "all") {
  if (!process.env.DATABASE_URL) return [] as EmailSignupRow[];
  const rows =
    storeId && storeId !== "all"
      ? await getSql()`select * from email_signups where store_id = ${storeId} order by created_at desc`
      : await getSql()`select * from email_signups order by created_at desc`;
  return rows.map((row) => rowFromDb(row as Record<string, unknown>));
}

export async function unsubscribeEmail(email: string) {
  const key = normalizeEmail(email);
  if (!process.env.DATABASE_URL) return;
  await getSql()`update email_signups set unsubscribed_at = now(), marketing_consent = false where lower(email) = ${key}`;
}

export async function anonymizeEmailRecords(email: string) {
  const key = normalizeEmail(email);
  const redacted = `deleted+${randomUUID().slice(0, 8)}@anonymous.invalid`;
  if (!process.env.DATABASE_URL) return redacted;
  const sql = getSql();
  await sql`update email_signups set email = ${redacted}, name = null, metadata = '{}'::jsonb where lower(email) = ${key}`;
  await sql`update orders set email = ${redacted}, card_names = '' where lower(email) = ${key}`;
  await sql`update shop_orders set email = ${redacted} where lower(email) = ${key}`;
  await sql`update preorders set email = ${redacted} where lower(email) = ${key}`;
  return redacted;
}

export async function listSuppressedEmails() {
  if (!process.env.DATABASE_URL) return new Set<string>();
  const rows = await getSql()`select email from email_suppressions`;
  return new Set(rows.map((row) => normalizeEmail(String((row as { email: string }).email))));
}

/** @internal test helper */
export function signupInsertTimestampParams(marketingConsent: boolean) {
  return {
    marketingConsentAt: marketingConsent ? "now()" : null,
    createdAt: "now()",
  };
}
