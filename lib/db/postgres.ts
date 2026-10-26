import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { collectVisitorAnalytics, listRollups, recomputeRollup } from "@/lib/db/analytics-methods";
import {
  ensureBuiltinStores,
  getStoreRow,
  getStoreSettings,
  listStoreRows,
  updateStoreSettings,
  upsertStoreRow,
} from "@/lib/db/tenant-methods";
import type { VisitorCollectPayload } from "@/lib/analytics/types";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { getSql } from "@/lib/db/client";
import type { AnalyticsEvent, Asset, Job, Order, Preorder, PrintOrder, Settings } from "@/lib/domain";
import { londonDay } from "@/lib/runtime";

const { orders, assets, jobs, events, prints, preorders, appSettings, dailySpend } = schema;

function db() {
  return drizzle(getSql(), { schema });
}

function at(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toOrder(row: typeof orders.$inferSelect): Order {
  return {
    id: row.id,
    storeId: row.storeId ?? DEFAULT_STORE_ID,
    createdAt: iso(row.createdAt)!,
    email: row.email,
    themeId: row.themeId,
    subjectType: row.subjectType as Order["subjectType"],
    tierId: row.tierId as Order["tierId"],
    styleIds: row.styleIds,
    cardNames: row.cardNames,
    status: row.status as Order["status"],
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    amountPence: row.amountPence,
    priority: row.priority,
    consentAt: iso(row.consentAt) ?? "",
    digitalSupplyConsentAt: iso(row.digitalSupplyConsentAt) ?? iso(row.consentAt) ?? "",
    utm: row.utm ?? {},
    referralCodeUsed: row.referralCodeUsed,
    ownReferralCode: row.ownReferralCode,
    resultsToken: row.resultsToken,
    uploadToken: row.uploadToken,
    generationCostGbp: row.generationCostGbp,
    deliveredAt: iso(row.deliveredAt),
    photosDeleteAfter: iso(row.photosDeleteAfter),
    resultsDeleteAfter: iso(row.resultsDeleteAfter),
    ipHash: row.ipHash,
    uploadsDeletedAt: iso(row.uploadsDeletedAt),
    resultsDeletedAt: iso(row.resultsDeletedAt),
    failureReason: row.failureReason,
    processedSessions: row.processedSessions,
    referralRewardGranted: row.referralRewardGranted,
    pendingBonusEmail: row.pendingBonusEmail,
    offer: row.offer === "season_pass" ? "season_pass" : "one_off",
    stripeSubscriptionId: row.stripeSubscriptionId,
    subscriptionStatus: row.subscriptionStatus === "active" || row.subscriptionStatus === "canceled" ? row.subscriptionStatus : null,
    payments: row.payments ?? [],
  };
}

function orderValues(order: Order): typeof orders.$inferInsert {
  return {
    id: order.id,
    storeId: order.storeId ?? DEFAULT_STORE_ID,
    createdAt: new Date(order.createdAt),
    email: order.email,
    themeId: order.themeId,
    subjectType: order.subjectType,
    tierId: order.tierId,
    styleIds: order.styleIds,
    cardNames: order.cardNames,
    status: order.status,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    stripePaymentIntentId: order.stripePaymentIntentId,
    amountPence: order.amountPence,
    priority: order.priority,
    consentAt: at(order.consentAt),
    digitalSupplyConsentAt: at(order.digitalSupplyConsentAt),
    utm: order.utm,
    referralCodeUsed: order.referralCodeUsed,
    ownReferralCode: order.ownReferralCode,
    resultsToken: order.resultsToken,
    uploadToken: order.uploadToken,
    generationCostGbp: order.generationCostGbp,
    deliveredAt: at(order.deliveredAt),
    photosDeleteAfter: at(order.photosDeleteAfter),
    resultsDeleteAfter: at(order.resultsDeleteAfter),
    ipHash: order.ipHash,
    uploadsDeletedAt: at(order.uploadsDeletedAt),
    resultsDeletedAt: at(order.resultsDeletedAt),
    failureReason: order.failureReason,
    processedSessions: order.processedSessions,
    referralRewardGranted: order.referralRewardGranted,
    pendingBonusEmail: order.pendingBonusEmail,
    offer: order.offer,
    stripeSubscriptionId: order.stripeSubscriptionId,
    subscriptionStatus: order.subscriptionStatus,
    payments: order.payments,
  };
}

function orderSet(patch: Partial<Order>): Partial<typeof orders.$inferInsert> {
  const set: Partial<typeof orders.$inferInsert> = {};
  if (patch.email !== undefined) set.email = patch.email;
  if (patch.themeId !== undefined) set.themeId = patch.themeId;
  if (patch.subjectType !== undefined) set.subjectType = patch.subjectType;
  if (patch.tierId !== undefined) set.tierId = patch.tierId;
  if (patch.styleIds !== undefined) set.styleIds = patch.styleIds;
  if (patch.cardNames !== undefined) set.cardNames = patch.cardNames;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.stripeCheckoutSessionId !== undefined) set.stripeCheckoutSessionId = patch.stripeCheckoutSessionId;
  if (patch.stripePaymentIntentId !== undefined) set.stripePaymentIntentId = patch.stripePaymentIntentId;
  if (patch.amountPence !== undefined) set.amountPence = patch.amountPence;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.consentAt !== undefined) set.consentAt = at(patch.consentAt);
  if (patch.digitalSupplyConsentAt !== undefined) set.digitalSupplyConsentAt = at(patch.digitalSupplyConsentAt);
  if (patch.utm !== undefined) set.utm = patch.utm;
  if (patch.referralCodeUsed !== undefined) set.referralCodeUsed = patch.referralCodeUsed;
  if (patch.ownReferralCode !== undefined) set.ownReferralCode = patch.ownReferralCode;
  if (patch.resultsToken !== undefined) set.resultsToken = patch.resultsToken;
  if (patch.uploadToken !== undefined) set.uploadToken = patch.uploadToken;
  if (patch.generationCostGbp !== undefined) set.generationCostGbp = patch.generationCostGbp;
  if (patch.deliveredAt !== undefined) set.deliveredAt = at(patch.deliveredAt);
  if (patch.photosDeleteAfter !== undefined) set.photosDeleteAfter = at(patch.photosDeleteAfter);
  if (patch.resultsDeleteAfter !== undefined) set.resultsDeleteAfter = at(patch.resultsDeleteAfter);
  if (patch.ipHash !== undefined) set.ipHash = patch.ipHash;
  if (patch.uploadsDeletedAt !== undefined) set.uploadsDeletedAt = at(patch.uploadsDeletedAt);
  if (patch.resultsDeletedAt !== undefined) set.resultsDeletedAt = at(patch.resultsDeletedAt);
  if (patch.failureReason !== undefined) set.failureReason = patch.failureReason;
  if (patch.processedSessions !== undefined) set.processedSessions = patch.processedSessions;
  if (patch.referralRewardGranted !== undefined) set.referralRewardGranted = patch.referralRewardGranted;
  if (patch.pendingBonusEmail !== undefined) set.pendingBonusEmail = patch.pendingBonusEmail;
  if (patch.offer !== undefined) set.offer = patch.offer;
  if (patch.stripeSubscriptionId !== undefined) set.stripeSubscriptionId = patch.stripeSubscriptionId;
  if (patch.subscriptionStatus !== undefined) set.subscriptionStatus = patch.subscriptionStatus;
  if (patch.payments !== undefined) set.payments = patch.payments;
  return set;
}

function toAsset(row: typeof assets.$inferSelect): Asset {
  return {
    id: row.id,
    orderId: row.orderId,
    kind: row.kind as Asset["kind"],
    styleId: row.styleId,
    variantIndex: row.variantIndex,
    storagePath: row.storagePath,
    bucket: row.bucket as Asset["bucket"],
    contentType: row.contentType,
    moderation: row.moderation as Asset["moderation"],
    createdAt: iso(row.createdAt)!,
  };
}

function toJob(row: typeof jobs.$inferSelect): Job {
  return {
    id: row.id,
    orderId: row.orderId,
    styleId: row.styleId,
    variantIndex: row.variantIndex,
    status: row.status as Job["status"],
    attempts: row.attempts,
    providerRequestId: row.providerRequestId,
    lastError: row.lastError,
    costGbp: row.costGbp,
    priority: row.priority,
    lockedUntil: iso(row.lockedUntil),
    nextRunAt: iso(row.nextRunAt),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  };
}

function toEvent(row: typeof events.$inferSelect): AnalyticsEvent {
  return {
    id: row.id,
    storeId: row.storeId ?? DEFAULT_STORE_ID,
    type: row.type as AnalyticsEvent["type"],
    orderId: row.orderId,
    createdAt: iso(row.createdAt)!,
  };
}

function toPrint(row: typeof prints.$inferSelect): PrintOrder {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId as PrintOrder["productId"],
    assetId: row.assetId,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    prodigiOrderId: row.prodigiOrderId,
    status: row.status as PrintOrder["status"],
    shipping: row.shipping,
    error: row.error,
    createdAt: iso(row.createdAt)!,
  };
}

function toPreorder(row: typeof preorders.$inferSelect): Preorder {
  return {
    id: row.id,
    storeId: row.storeId ?? DEFAULT_STORE_ID,
    orderId: row.orderId,
    email: row.email,
    themeId: row.themeId,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    amountPence: row.amountPence,
    status: row.status as Preorder["status"],
    createdAt: iso(row.createdAt)!,
  };
}

function toSettings(row: typeof appSettings.$inferSelect): Settings {
  return {
    themeMode: row.themeMode,
    activeThemeId: row.activeThemeId,
    salesPaused: row.salesPaused,
    queueHalted: row.queueHalted,
    haltReason: row.haltReason,
    haltNotifiedOn: row.haltNotifiedOn,
  };
}

const defaultSettings = (): Settings => ({
  themeMode: "auto",
  activeThemeId: "halloween",
  salesPaused: false,
  queueHalted: false,
  haltReason: null,
  haltNotifiedOn: null,
});

export const postgresStore = {
  async getSettings(storeId = DEFAULT_STORE_ID) {
    await ensureBuiltinStores();
    return getStoreSettings(storeId);
  },
  async updateSettings(patch: Partial<Settings>, storeId = DEFAULT_STORE_ID) {
    return updateStoreSettings(storeId, patch);
  },
  async listStores() {
    return listStoreRows();
  },
  async getStoreConfig(id: string) {
    return getStoreRow(id);
  },
  async upsertStore(input: { id: string; slug: string; domains: string[]; config?: Record<string, unknown> }) {
    return upsertStoreRow(input);
  },
  async collectAnalytics(storeId: string, payload: VisitorCollectPayload, countryCode?: string | null) {
    return collectVisitorAnalytics(storeId, payload, countryCode);
  },
  async getAnalyticsRollups(storeId: string | "all", from: string, to: string) {
    return listRollups(storeId, from, to);
  },
  async refreshAnalyticsRollup(storeId: string, day?: string) {
    return recomputeRollup(storeId, day ?? londonDay());
  },
  async createOrder(order: Order) {
    await db().insert(orders).values(orderValues(order));
  },
  async updateOrder(id: string, patch: Partial<Order>) {
    const set = orderSet(patch);
    if (!Object.keys(set).length) {
      const current = await this.getOrder(id);
      if (!current) throw new Error("Order not found");
      return current;
    }
    const [row] = await db().update(orders).set(set).where(eq(orders.id, id)).returning();
    if (!row) throw new Error("Order not found");
    return toOrder(row);
  },
  async getOrder(id: string) {
    const [row] = await db().select().from(orders).where(eq(orders.id, id)).limit(1);
    return row ? toOrder(row) : null;
  },
  async getOrderByToken(token: string) {
    const [row] = await db().select().from(orders).where(eq(orders.resultsToken, token)).limit(1);
    return row ? toOrder(row) : null;
  },
  async getOrderByUploadToken(orderId: string, token: string) {
    const [row] = await db()
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.uploadToken, token)))
      .limit(1);
    return row ? toOrder(row) : null;
  },
  async getOrderByCheckoutSession(sessionId: string) {
    const [row] = await db().select().from(orders).where(eq(orders.stripeCheckoutSessionId, sessionId)).limit(1);
    return row ? toOrder(row) : null;
  },
  async getOrderByReferralCode(code: string, storeId?: string) {
    const clauses = [sql`lower(${orders.ownReferralCode}) = ${code.toLowerCase()}`];
    if (storeId) clauses.push(eq(orders.storeId, storeId));
    const [row] = await db()
      .select()
      .from(orders)
      .where(and(...clauses))
      .limit(1);
    return row ? toOrder(row) : null;
  },
  async getOrderBySubscription(subscriptionId: string) {
    const [row] = await db().select().from(orders).where(eq(orders.stripeSubscriptionId, subscriptionId)).limit(1);
    return row ? toOrder(row) : null;
  },
  async listOrders(storeId?: string | "all") {
    const rows =
      storeId && storeId !== "all"
        ? await db().select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.createdAt))
        : await db().select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(toOrder);
  },
  async addAsset(asset: Asset) {
    await db().insert(assets).values({
      id: asset.id,
      orderId: asset.orderId,
      kind: asset.kind,
      styleId: asset.styleId,
      variantIndex: asset.variantIndex,
      storagePath: asset.storagePath,
      bucket: asset.bucket,
      contentType: asset.contentType,
      moderation: asset.moderation,
      createdAt: new Date(asset.createdAt),
    });
  },
  async listAssets(orderId: string) {
    const rows = await db().select().from(assets).where(eq(assets.orderId, orderId));
    return rows.map(toAsset);
  },
  async deleteAssets(ids: string[]) {
    if (!ids.length) return [];
    const rows = await db().delete(assets).where(inArray(assets.id, ids)).returning();
    return rows.map(toAsset);
  },
  async addJobs(items: Job[]) {
    if (!items.length) return;
    await db().insert(jobs).values(
      items.map((job) => ({
        id: job.id,
        orderId: job.orderId,
        styleId: job.styleId,
        variantIndex: job.variantIndex,
        status: job.status,
        attempts: job.attempts,
        providerRequestId: job.providerRequestId,
        lastError: job.lastError,
        costGbp: job.costGbp,
        priority: job.priority,
        lockedUntil: at(job.lockedUntil),
        nextRunAt: at(job.nextRunAt),
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      })),
    );
  },
  async listJobs(orderId?: string) {
    const rows = orderId
      ? await db().select().from(jobs).where(eq(jobs.orderId, orderId))
      : await db().select().from(jobs);
    return rows.map(toJob);
  },
  async updateJob(id: string, patch: Partial<Job>) {
    const set: Partial<typeof jobs.$inferInsert> = { updatedAt: new Date() };
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.attempts !== undefined) set.attempts = patch.attempts;
    if (patch.providerRequestId !== undefined) set.providerRequestId = patch.providerRequestId;
    if (patch.lastError !== undefined) set.lastError = patch.lastError;
    if (patch.costGbp !== undefined) set.costGbp = patch.costGbp;
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.lockedUntil !== undefined) set.lockedUntil = at(patch.lockedUntil);
    if (patch.nextRunAt !== undefined) set.nextRunAt = at(patch.nextRunAt);
    if (patch.styleId !== undefined) set.styleId = patch.styleId;
    if (patch.variantIndex !== undefined) set.variantIndex = patch.variantIndex;
    const [row] = await db().update(jobs).set(set).where(eq(jobs.id, id)).returning();
    if (!row) throw new Error("Job not found");
    return toJob(row);
  },
  async claimJobs(limit: number) {
    const count = Math.max(1, Math.min(50, Math.floor(limit)));
    const client = getSql();
    const rows = await client<{
      id: string;
      order_id: string;
      style_id: string;
      variant_index: number;
      status: string;
      attempts: number;
      provider_request_id: string | null;
      last_error: string | null;
      cost_gbp: string;
      priority: boolean;
      locked_until: Date | null;
      next_run_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }[]>`
      update jobs as claimed
      set status = 'running',
          locked_until = now() + interval '8 minutes',
          updated_at = now()
      where claimed.id in (
        select j.id
        from jobs j
        join orders o on o.id = j.order_id
        where o.status not in ('refunded', 'pending_payment')
          and (
            (j.status = 'queued' and (j.next_run_at is null or j.next_run_at <= now()))
            or (
              j.status in ('submitted', 'running')
              and coalesce(j.locked_until, j.updated_at + interval '8 minutes') <= now()
            )
          )
        order by j.priority desc, j.created_at asc
        limit ${count}
        for update of j skip locked
      )
      returning claimed.id, claimed.order_id, claimed.style_id, claimed.variant_index, claimed.status,
        claimed.attempts, claimed.provider_request_id, claimed.last_error, claimed.cost_gbp, claimed.priority,
        claimed.locked_until, claimed.next_run_at, claimed.created_at, claimed.updated_at
    `;
    return rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      styleId: row.style_id,
      variantIndex: row.variant_index,
      status: "running" as const,
      attempts: row.attempts,
      providerRequestId: row.provider_request_id,
      lastError: row.last_error,
      costGbp: Number(row.cost_gbp),
      priority: row.priority,
      lockedUntil: iso(row.locked_until),
      nextRunAt: iso(row.next_run_at),
      createdAt: iso(row.created_at)!,
      updatedAt: iso(row.updated_at)!,
    }));
  },
  async addEvent(event: AnalyticsEvent) {
    await db().insert(events).values({
      id: event.id,
      storeId: event.storeId ?? DEFAULT_STORE_ID,
      type: event.type,
      orderId: event.orderId,
      createdAt: new Date(event.createdAt),
    });
  },
  async countEvents(type: AnalyticsEvent["type"], day?: string, storeId?: string | "all") {
    const rows =
      storeId && storeId !== "all"
        ? await db().select().from(events).where(and(eq(events.type, type), eq(events.storeId, storeId)))
        : await db().select().from(events).where(eq(events.type, type));
    return rows.filter((row) => !day || londonDay(row.createdAt) === day).length;
  },
  async addPrint(print: PrintOrder) {
    await db().insert(prints).values({
      id: print.id,
      orderId: print.orderId,
      productId: print.productId,
      assetId: print.assetId,
      stripeCheckoutSessionId: print.stripeCheckoutSessionId,
      stripePaymentIntentId: print.stripePaymentIntentId,
      prodigiOrderId: print.prodigiOrderId,
      status: print.status,
      shipping: print.shipping,
      error: print.error,
      createdAt: new Date(print.createdAt),
    });
  },
  async listPrints(orderId?: string) {
    const rows = orderId
      ? await db().select().from(prints).where(eq(prints.orderId, orderId))
      : await db().select().from(prints);
    return rows.map(toPrint);
  },
  async getPrintBySession(sessionId: string) {
    const [row] = await db().select().from(prints).where(eq(prints.stripeCheckoutSessionId, sessionId)).limit(1);
    return row ? toPrint(row) : null;
  },
  async updatePrint(id: string, patch: Partial<PrintOrder>) {
    const set: Partial<typeof prints.$inferInsert> = {};
    if (patch.productId !== undefined) set.productId = patch.productId;
    if (patch.assetId !== undefined) set.assetId = patch.assetId;
    if (patch.stripeCheckoutSessionId !== undefined) set.stripeCheckoutSessionId = patch.stripeCheckoutSessionId;
    if (patch.stripePaymentIntentId !== undefined) set.stripePaymentIntentId = patch.stripePaymentIntentId;
    if (patch.prodigiOrderId !== undefined) set.prodigiOrderId = patch.prodigiOrderId;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.shipping !== undefined) set.shipping = patch.shipping;
    if (patch.error !== undefined) set.error = patch.error;
    const [row] = await db().update(prints).set(set).where(eq(prints.id, id)).returning();
    if (!row) throw new Error("Print order not found");
    return toPrint(row);
  },
  async addPreorder(preorder: Preorder) {
    await db().insert(preorders).values({
      id: preorder.id,
      storeId: preorder.storeId ?? DEFAULT_STORE_ID,
      orderId: preorder.orderId,
      email: preorder.email,
      themeId: preorder.themeId,
      stripeCheckoutSessionId: preorder.stripeCheckoutSessionId,
      stripePaymentIntentId: preorder.stripePaymentIntentId,
      amountPence: preorder.amountPence,
      status: preorder.status,
      createdAt: new Date(preorder.createdAt),
    });
  },
  async getPreorderBySession(sessionId: string) {
    const [row] = await db().select().from(preorders).where(eq(preorders.stripeCheckoutSessionId, sessionId)).limit(1);
    return row ? toPreorder(row) : null;
  },
  async listPreorders(storeId?: string | "all") {
    const rows =
      storeId && storeId !== "all"
        ? await db().select().from(preorders).where(eq(preorders.storeId, storeId)).orderBy(desc(preorders.createdAt))
        : await db().select().from(preorders).orderBy(desc(preorders.createdAt));
    return rows.map(toPreorder);
  },
  async updatePreorder(id: string, patch: Partial<Preorder>) {
    const set: Partial<typeof preorders.$inferInsert> = {};
    if (patch.orderId !== undefined) set.orderId = patch.orderId;
    if (patch.email !== undefined) set.email = patch.email;
    if (patch.themeId !== undefined) set.themeId = patch.themeId;
    if (patch.stripeCheckoutSessionId !== undefined) set.stripeCheckoutSessionId = patch.stripeCheckoutSessionId;
    if (patch.stripePaymentIntentId !== undefined) set.stripePaymentIntentId = patch.stripePaymentIntentId;
    if (patch.amountPence !== undefined) set.amountPence = patch.amountPence;
    if (patch.status !== undefined) set.status = patch.status;
    const [row] = await db().update(preorders).set(set).where(eq(preorders.id, id)).returning();
    if (!row) throw new Error("Pre-order not found");
    return toPreorder(row);
  },
  async hitRateLimit(key: string, limit: number, windowMs: number) {
    const client = getSql();
    return client.begin(async (tx) => {
      const rows = await tx<{ count: number; reset_at: Date }[]>`
        select count, reset_at from rate_buckets where bucket_key = ${key} for update
      `;
      const now = Date.now();
      const row = rows[0];
      if (!row || row.reset_at.getTime() <= now) {
        const resetAt = new Date(now + windowMs);
        await tx`
          insert into rate_buckets (bucket_key, count, reset_at)
          values (${key}, 1, ${resetAt})
          on conflict (bucket_key) do update set count = 1, reset_at = ${resetAt}
        `;
        return { ok: true as const, remaining: limit - 1 };
      }
      if (row.count >= limit) return { ok: false as const, remaining: 0 };
      await tx`update rate_buckets set count = count + 1 where bucket_key = ${key}`;
      return { ok: true as const, remaining: limit - row.count - 1 };
    });
  },
  async addSpend(gbp: number, storeId = DEFAULT_STORE_ID) {
    const day = londonDay();
    const rows = await getSql()<{ gbp: string }[]>`
      insert into daily_spend (store_id, day, gbp)
      values (${storeId}, ${day}, ${gbp})
      on conflict (store_id, day) do update
      set gbp = round(daily_spend.gbp + excluded.gbp, 4)
      returning gbp
    `;
    return Number(rows[0]?.gbp ?? 0);
  },
  async todaySpend(storeId = DEFAULT_STORE_ID) {
    const [row] = await db()
      .select()
      .from(dailySpend)
      .where(and(eq(dailySpend.storeId, storeId), eq(dailySpend.day, londonDay())))
      .limit(1);
    return row?.gbp ?? 0;
  },
};
