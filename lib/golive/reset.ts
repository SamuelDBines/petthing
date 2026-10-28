import { getSql } from "@/lib/db/client";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";

export type GoliveResetCounts = Record<string, number>;

export class GoliveResetBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoliveResetBlockedError";
  }
}

export function resolveStoreScope(storeArg: string) {
  if (storeArg === "all") return BUILTIN_STORES.map((store) => store.id);
  const match = BUILTIN_STORES.find((store) => store.id === storeArg || store.slug === storeArg);
  if (!match) throw new Error(`Unknown store: ${storeArg}`);
  return [match.id];
}

function isDemoStripeId(id: string | null | undefined) {
  if (!id) return true;
  return id.startsWith("demo_") || id.startsWith("cs_test_") || id.startsWith("pi_test_");
}

export async function findLiveStripeOrders(storeIds: string[]) {
  if (!process.env.DATABASE_URL) return [] as { id: string; table: string; stripeId: string }[];
  const sql = getSql();
  const hits: { id: string; table: string; stripeId: string }[] = [];
  for (const storeId of storeIds) {
    const portraitRows = await sql`
      select id, stripe_checkout_session_id, stripe_payment_intent_id, payments
      from orders where store_id = ${storeId}
    `;
    for (const row of portraitRows as unknown as {
      id: string;
      stripe_checkout_session_id: string | null;
      stripe_payment_intent_id: string | null;
      payments: { paymentIntentId?: string | null; sessionId?: string }[];
    }[]) {
      const ids = [
        row.stripe_checkout_session_id,
        row.stripe_payment_intent_id,
        ...(row.payments ?? []).map((payment) => payment.paymentIntentId ?? payment.sessionId),
      ].filter(Boolean) as string[];
      if (ids.some((id) => !isDemoStripeId(id) && !id.includes("test"))) {
        hits.push({ id: row.id, table: "orders", stripeId: ids.find((id) => !isDemoStripeId(id))! });
      }
    }
    const shopRows = await sql`
      select id, stripe_checkout_session_id, stripe_payment_intent_id
      from shop_orders where store_id = ${storeId}
    `;
    for (const row of shopRows as unknown as {
      id: string;
      stripe_checkout_session_id: string | null;
      stripe_payment_intent_id: string | null;
    }[]) {
      const ids = [row.stripe_checkout_session_id, row.stripe_payment_intent_id].filter(Boolean) as string[];
      if (ids.some((id) => !isDemoStripeId(id) && !id.includes("test"))) {
        hits.push({ id: row.id, table: "shop_orders", stripeId: ids.find((id) => !isDemoStripeId(id))! });
      }
    }
  }
  return hits;
}

async function countForStore(storeId: string) {
  const sql = getSql();
  const counts: GoliveResetCounts = {};
  const scalar = async (label: string, query: PromiseLike<readonly unknown[]>) => {
    counts[label] = (await query).length;
  };
  await scalar("visitor_sessions", sql`select id from visitor_sessions where store_id = ${storeId}`);
  await scalar("visitor_events", sql`select id from visitor_events where store_id = ${storeId}`);
  await scalar("analytics_daily_rollups", sql`select day from analytics_daily_rollups where store_id = ${storeId}`);
  await scalar("orders", sql`select id from orders where store_id = ${storeId}`);
  await scalar(
    "assets",
    sql`select a.id from assets a join orders o on o.id = a.order_id where o.store_id = ${storeId}`,
  );
  await scalar("jobs", sql`select j.id from jobs j join orders o on o.id = j.order_id where o.store_id = ${storeId}`);
  await scalar("prints", sql`select p.id from prints p join orders o on o.id = p.order_id where o.store_id = ${storeId}`);
  await scalar("shop_orders", sql`select id from shop_orders where store_id = ${storeId}`);
  await scalar("preorders", sql`select id from preorders where store_id = ${storeId}`);
  await scalar("email_signups", sql`select id from email_signups where store_id = ${storeId}`);
  await scalar("events", sql`select id from events where store_id = ${storeId}`);
  await scalar(
    "hand_painted_orders",
    sql`select h.id from hand_painted_orders h join orders o on o.id = h.order_id where o.store_id = ${storeId}`,
  );
  return counts;
}

export async function goliveResetCounts(storeIds: string[]): Promise<GoliveResetCounts> {
  if (!process.env.DATABASE_URL) return { note: 0 };
  const totals: GoliveResetCounts = {};
  for (const storeId of storeIds) {
    const part = await countForStore(storeId);
    for (const [key, value] of Object.entries(part)) {
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  const sql = getSql();
  totals.fal_provider_incidents = (await sql`select id from fal_provider_incidents`).length;
  return totals;
}

export async function executeGoliveReset(storeIds: string[]) {
  const live = await findLiveStripeOrders(storeIds);
  if (live.length) {
    throw new GoliveResetBlockedError(
      `Refusing reset: ${live.length} order(s) appear to have live Stripe IDs (e.g. ${live[0]!.table}/${live[0]!.id}).`,
    );
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for golive reset.");
  const sql = getSql();
  await sql.begin(async (tx) => {
    for (const storeId of storeIds) {
      await tx`delete from visitor_events where store_id = ${storeId}`;
      await tx`delete from visitor_sessions where store_id = ${storeId}`;
      await tx`delete from analytics_daily_rollups where store_id = ${storeId}`;
      await tx`delete from jobs where order_id in (select id from orders where store_id = ${storeId})`;
      await tx`delete from assets where order_id in (select id from orders where store_id = ${storeId})`;
      await tx`delete from prints where order_id in (select id from orders where store_id = ${storeId})`;
      await tx`delete from hand_painted_orders where order_id in (select id from orders where store_id = ${storeId})`;
      await tx`delete from events where store_id = ${storeId}`;
      await tx`delete from orders where store_id = ${storeId}`;
      await tx`delete from shop_orders where store_id = ${storeId}`;
      await tx`delete from preorders where store_id = ${storeId}`;
      await tx`delete from email_signups where store_id = ${storeId}`;
      await tx`delete from daily_spend where store_id = ${storeId}`;
    }
    await tx`delete from fal_provider_incidents`;
  });
}
