import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { HandPaintedOrderRow } from "@/lib/handPainted";
import type { CatalogueProduct, ShopOrder, SupplierBatchExport } from "@/lib/catalogue/types";
import type { AnalyticsEvent, Asset, Database, Job, Order, Preorder, PrintOrder, Settings } from "@/lib/domain";
import type { AnalyticsCollectContext, VisitorCollectPayload } from "@/lib/analytics/types";
import { classifyTraffic, browserFromUserAgent, referrerDomain } from "@/lib/analytics/traffic";
import { INTERACTION_EVENT_TYPES } from "@/lib/analytics/metrics";
import { mergeRollups, rollupDay } from "@/lib/analytics/rollup";
import { BUILTIN_STORES, DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { configFromRow } from "@/lib/tenant/resolve";
import type { StoreRow } from "@/lib/tenant/types";
import { jobIsClaimable, LOCK_MS } from "@/lib/queue";
import { localDataPath } from "@/lib/localPaths";
import { londonDay } from "@/lib/runtime";

const file = localDataPath("db.json");

const defaultSettings = (): Settings => ({
  themeMode: "auto",
  activeThemeId: "halloween",
  salesPaused: false,
  queueHalted: false,
  haltReason: null,
  haltNotifiedOn: null,
});

function emptyDb(): Database {
  const settingsByStore: Record<string, Settings> = {};
  for (const store of BUILTIN_STORES) settingsByStore[store.id] = { ...store.settings };
  return {
    orders: [],
    assets: [],
    jobs: [],
    events: [],
    prints: [],
    preorders: [],
    shopOrders: [],
    supplierBatches: [],
    handPaintedOrders: [],
    settings: settingsByStore[DEFAULT_STORE_ID],
    settingsByStore,
    storeConfigPatches: {},
    rateLimits: [],
    spend: [],
    visitorSessions: [],
    visitorEvents: [],
    analyticsRollups: [],
    catalogueProducts: [],
    adminLoginEvents: [],
  };
}

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Database> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Database;
    const base = emptyDb();
    return {
      ...base,
      ...parsed,
      orders: (parsed.orders ?? []).map((order) => ({
        ...order,
        storeId: order.storeId ?? DEFAULT_STORE_ID,
        offer: order.offer ?? "one_off",
        stripeSubscriptionId: order.stripeSubscriptionId ?? null,
        subscriptionStatus: order.subscriptionStatus ?? null,
        digitalSupplyConsentAt: order.digitalSupplyConsentAt ?? order.consentAt ?? "",
      })),
      events: (parsed.events ?? []).map((event) => ({ ...event, storeId: event.storeId ?? DEFAULT_STORE_ID })),
      preorders: (parsed.preorders ?? []).map((row) => ({ ...row, storeId: row.storeId ?? DEFAULT_STORE_ID })),
      settingsByStore: { ...base.settingsByStore, ...(parsed.settingsByStore ?? {}) },
      storeConfigPatches: parsed.storeConfigPatches ?? {},
      visitorSessions: parsed.visitorSessions ?? [],
      visitorEvents: parsed.visitorEvents ?? [],
      analyticsRollups: parsed.analyticsRollups ?? [],
      catalogueProducts: parsed.catalogueProducts ?? [],
      adminLoginEvents: parsed.adminLoginEvents ?? [],
      shopOrders: parsed.shopOrders ?? [],
      supplierBatches: parsed.supplierBatches ?? [],
      handPaintedOrders: parsed.handPaintedOrders ?? [],
      spend: (parsed.spend ?? []).map((row) => ({ storeId: row.storeId ?? DEFAULT_STORE_ID, day: row.day, gbp: row.gbp })),
      jobs: (parsed.jobs ?? []).map((job) => ({
        ...job,
        lockedUntil: job.lockedUntil ?? null,
        nextRunAt: job.nextRunAt ?? null,
      })),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw error;
  }
}

async function write(db: Database) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, file);
}

function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function storeSettings(db: Database, storeId: string) {
  return db.settingsByStore[storeId] ?? BUILTIN_STORES.find((s) => s.id === storeId)?.settings ?? defaultSettings();
}

function recomputeJsonRollup(db: Database, storeId: string, day: string) {
  const sessions = db.visitorSessions.filter((s) => s.storeId === storeId && londonDay(new Date(s.startedAt)) === day);
  const events = db.visitorEvents.filter((e) => e.storeId === storeId && londonDay(new Date(e.createdAt)) === day);
  const metrics = rollupDay(sessions, events);
  const idx = db.analyticsRollups.findIndex((r) => r.storeId === storeId && r.day === day);
  if (idx >= 0) db.analyticsRollups[idx] = { storeId, day, metrics };
  else db.analyticsRollups.push({ storeId, day, metrics });
}

export const jsonStore = {
  getSettings: (storeId = DEFAULT_STORE_ID) => withDb((db) => structuredClone(storeSettings(db, storeId))),
  updateSettings: (patch: Partial<Settings>, storeId = DEFAULT_STORE_ID) =>
    withDb((db) => {
      db.settingsByStore[storeId] = { ...storeSettings(db, storeId), ...patch };
      if (storeId === DEFAULT_STORE_ID) db.settings = db.settingsByStore[storeId];
      return structuredClone(db.settingsByStore[storeId]);
    }),
  listStores: () =>
    withDb((db) =>
      BUILTIN_STORES.map((builtin): StoreRow => {
        const patch = (db.storeConfigPatches[builtin.id] as Partial<import("@/lib/tenant/types").StoreConfig>) ?? null;
        return {
          id: builtin.id,
          slug: builtin.slug,
          domains: patch?.domains?.length ? patch.domains : builtin.domains,
          config: configFromRow(builtin.id, patch),
          createdAt: new Date().toISOString(),
        };
      }),
    ),
  getStoreConfig: (id: string) =>
    withDb(async (db) => {
      const builtin = BUILTIN_STORES.find((s) => s.id === id);
      const patch = (db.storeConfigPatches[id] as Partial<import("@/lib/tenant/types").StoreConfig>) ?? null;
      return {
        id,
        slug: builtin?.slug ?? id,
        domains: patch?.domains?.length ? patch.domains : builtin?.domains ?? [],
        config: configFromRow(id, patch),
        createdAt: new Date().toISOString(),
      };
    }),
  upsertStore: (input: { id: string; slug: string; domains: string[]; config?: Record<string, unknown> }) =>
    withDb((db) => {
      const prev = (db.storeConfigPatches[input.id] as Record<string, unknown>) ?? {};
      const next = input.config ?? {};
      const patch = {
        ...prev,
        ...next,
        domains: input.domains,
        catalog: { ...(prev.catalog as object), ...(next.catalog as object) },
        brand: { ...(prev.brand as object), ...(next.brand as object) },
      };
      db.storeConfigPatches[input.id] = patch;
      return {
        id: input.id,
        slug: input.slug,
        domains: input.domains,
        config: configFromRow(input.id, patch as Partial<import("@/lib/tenant/types").StoreConfig>),
        createdAt: new Date().toISOString(),
      };
    }),
  collectAnalytics: (storeId: string, payload: VisitorCollectPayload, context: import("@/lib/analytics/types").AnalyticsCollectContext = {}) =>
    withDb((db) => {
      const now = new Date().toISOString();
      const day = londonDay(new Date(now));
      const userAgent = payload.userAgent ?? context.userAgent ?? null;
      const traffic = classifyTraffic({
        userAgent,
        internalCheckHeader: context.internalCheckHeader,
        ip: context.ip,
        excludeCookie: context.excludeCookie,
        isAdmin: context.isAdmin,
      });
      const visitorId =
        payload.consent === "analytics" && payload.visitorId
          ? payload.visitorId
          : `agg:${storeId}:${day}:${payload.path}`;
      let sessionId = payload.sessionId;
      let session = sessionId ? db.visitorSessions.find((s) => s.id === sessionId) : undefined;
      if (!session) {
        sessionId = randomUUID();
        const isNew = !db.visitorSessions.some((s) => s.storeId === storeId && s.visitorId === visitorId);
        const hadInteraction = Boolean(payload.event && INTERACTION_EVENT_TYPES.has(payload.event.type));
        session = {
          id: sessionId,
          storeId,
          visitorId,
          consentLevel: payload.consent,
          isNewVisitor: isNew,
          referrer: payload.referrer ?? null,
          referrerDomain: referrerDomain(payload.referrer),
          utmSource: payload.utm?.utm_source ?? null,
          utmMedium: payload.utm?.utm_medium ?? null,
          utmCampaign: payload.utm?.utm_campaign ?? null,
          gclid: payload.clickIds?.gclid ?? payload.utm?.gclid ?? null,
          fbclid: payload.clickIds?.fbclid ?? payload.utm?.fbclid ?? null,
          ttclid: payload.clickIds?.ttclid ?? payload.utm?.ttclid ?? null,
          landingPath: payload.path,
          exitPath: payload.path,
          deviceType: payload.deviceType ?? null,
          browser: browserFromUserAgent(userAgent),
          countryCode: context.countryCode ?? null,
          startedAt: now,
          endedAt: null,
          pageviewCount: 1,
          bounced: true,
          hadInteraction,
          durationMs: payload.durationMs ?? 0,
          maxScrollDepth: payload.scrollDepth ?? 0,
          rageClicks: payload.rageClick ? 1 : 0,
          jsErrors: payload.jsError ? 1 : 0,
          slowLoads: payload.slowLoadMs && payload.slowLoadMs > 4000 ? 1 : 0,
          excludedFromMetrics: traffic.excluded,
          exclusionReason: traffic.reason,
        };
        db.visitorSessions.push(session);
        db.visitorEvents.push({
          id: randomUUID(),
          storeId,
          sessionId,
          visitorId,
          eventType: "landing",
          path: payload.path,
          metadata: {},
          createdAt: now,
        });
      } else {
        session.exitPath = payload.path;
        session.pageviewCount += 1;
        session.durationMs = Math.max(session.durationMs, payload.durationMs ?? 0);
        session.maxScrollDepth = Math.max(session.maxScrollDepth, payload.scrollDepth ?? 0);
        if (payload.rageClick) session.rageClicks += 1;
        if (payload.jsError) session.jsErrors += 1;
        if (payload.slowLoadMs && payload.slowLoadMs > 4000) session.slowLoads += 1;
        if (payload.event && INTERACTION_EVENT_TYPES.has(payload.event.type)) session.hadInteraction = true;
        session.bounced = session.pageviewCount <= 1 && !session.hadInteraction && session.durationMs < 10_000;
        if (traffic.excluded) {
          session.excludedFromMetrics = true;
          session.exclusionReason = traffic.reason;
        }
        if (payload.leave) session.endedAt = now;
      }
      if (payload.event) {
        db.visitorEvents.push({
          id: randomUUID(),
          storeId,
          sessionId: sessionId!,
          visitorId,
          eventType: payload.event.type,
          path: payload.path,
          metadata: payload.event.metadata ?? {},
          createdAt: now,
        });
        if (INTERACTION_EVENT_TYPES.has(payload.event.type)) {
          session.hadInteraction = true;
          session.bounced = false;
        }
      }
      recomputeJsonRollup(db, storeId, day);
      return { sessionId, visitorId };
    }),
  recordServerFunnelEvent: (args: {
    storeId: string;
    eventType: string;
    visitorSessionId?: string | null;
    visitorId?: string | null;
    path?: string | null;
    metadata?: Record<string, unknown>;
  }) =>
    withDb((db) => {
      const now = new Date().toISOString();
      db.visitorEvents.push({
        id: randomUUID(),
        storeId: args.storeId,
        sessionId: args.visitorSessionId ?? null,
        visitorId: args.visitorId ?? null,
        eventType: args.eventType,
        path: args.path ?? "/",
        metadata: args.metadata ?? {},
        createdAt: now,
      });
      if (args.visitorSessionId) {
        const session = db.visitorSessions.find((row) => row.id === args.visitorSessionId);
        if (session && INTERACTION_EVENT_TYPES.has(args.eventType)) {
          session.hadInteraction = true;
          session.bounced = false;
        }
      }
      recomputeJsonRollup(db, args.storeId, londonDay());
    }),
  countActiveVisitors: (storeId: string | "all", includeExcluded = false) =>
    withDb((db) => {
      const since = Date.now() - 5 * 60 * 1000;
      const rows = db.visitorSessions.filter(
        (session) =>
          Date.parse(session.startedAt) >= since &&
          (storeId === "all" || session.storeId === storeId) &&
          (includeExcluded || !session.excludedFromMetrics),
      );
      return new Set(rows.map((row) => row.visitorId)).size;
    }),
  getAnalyticsRollups: (storeId: string | "all", from: string, to: string, includeExcluded = false) =>
    withDb((db) => {
      if (includeExcluded) {
        const days: string[] = [];
        const cursor = new Date(`${from}T00:00:00.000Z`);
        const end = new Date(`${to}T00:00:00.000Z`);
        while (cursor <= end) {
          days.push(cursor.toISOString().slice(0, 10));
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return days.map((day) => {
          const sessions = db.visitorSessions.filter(
            (s) =>
              londonDay(new Date(s.startedAt)) === day && (storeId === "all" || s.storeId === storeId),
          );
          const events = db.visitorEvents.filter(
            (e) =>
              londonDay(new Date(e.createdAt)) === day && (storeId === "all" || e.storeId === storeId),
          );
          return { day, metrics: rollupDay(sessions, events, { includeExcluded: true }) };
        });
      }
      const rows = db.analyticsRollups.filter((row) => row.day >= from && row.day <= to && (storeId === "all" || row.storeId === storeId));
      if (storeId === "all") {
        const byDay = new Map<string, import("@/lib/analytics/types").DailyRollupMetrics>();
        for (const row of rows) {
          const existing = byDay.get(row.day);
          if (!existing) byDay.set(row.day, row.metrics);
          else byDay.set(row.day, mergeRollups([existing, row.metrics]));
        }
        return [...byDay.entries()].map(([day, metrics]) => ({ day, metrics }));
      }
      return rows.map((row) => ({ day: row.day, metrics: row.metrics }));
    }),
  refreshAnalyticsRollup: (storeId: string, day?: string) =>
    withDb((db) => {
      recomputeJsonRollup(db, storeId, day ?? londonDay());
    }),
  createOrder: (order: Order) =>
    withDb((db) => {
      db.orders.push({ ...order, storeId: order.storeId ?? DEFAULT_STORE_ID });
    }),
  updateOrder: (id: string, patch: Partial<Order>) =>
    withDb((db) => {
      const order = db.orders.find((item) => item.id === id);
      if (!order) throw new Error("Order not found");
      Object.assign(order, patch);
      return structuredClone(order);
    }),
  getOrder: (id: string) => withDb((db) => structuredClone(db.orders.find((item) => item.id === id) ?? null)),
  getOrderByToken: (token: string) =>
    withDb((db) => structuredClone(db.orders.find((item) => item.resultsToken === token) ?? null)),
  getOrderByUploadToken: (orderId: string, token: string) =>
    withDb((db) => structuredClone(db.orders.find((item) => item.id === orderId && item.uploadToken === token) ?? null)),
  getOrderByCheckoutSession: (sessionId: string) =>
    withDb((db) => structuredClone(db.orders.find((item) => item.stripeCheckoutSessionId === sessionId) ?? null)),
  getOrderByReferralCode: (code: string, storeId?: string) =>
    withDb((db) =>
      structuredClone(
        db.orders.find(
          (item) =>
            item.ownReferralCode.toLowerCase() === code.toLowerCase() && (!storeId || item.storeId === storeId),
        ) ?? null,
      ),
    ),
  getOrderBySubscription: (subscriptionId: string) =>
    withDb((db) => structuredClone(db.orders.find((item) => item.stripeSubscriptionId === subscriptionId) ?? null)),
  listOrders: (storeId?: string | "all") =>
    withDb((db) =>
      structuredClone(
        [...db.orders]
          .filter((order) => !storeId || storeId === "all" || order.storeId === storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    ),
  addAsset: (asset: Asset) =>
    withDb((db) => {
      db.assets.push(asset);
    }),
  listAssets: (orderId: string) =>
    withDb((db) => structuredClone(db.assets.filter((asset) => asset.orderId === orderId))),
  deleteAssets: (ids: string[]) =>
    withDb((db) => {
      const removed = db.assets.filter((asset) => ids.includes(asset.id));
      db.assets = db.assets.filter((asset) => !ids.includes(asset.id));
      return structuredClone(removed);
    }),
  addJobs: (jobs: Job[]) =>
    withDb((db) => {
      db.jobs.push(...jobs);
    }),
  listJobs: (orderId?: string) =>
    withDb((db) => structuredClone(orderId ? db.jobs.filter((job) => job.orderId === orderId) : db.jobs)),
  updateJob: (id: string, patch: Partial<Job>) =>
    withDb((db) => {
      const job = db.jobs.find((item) => item.id === id);
      if (!job) throw new Error("Job not found");
      Object.assign(job, patch, { updatedAt: new Date().toISOString() });
      return structuredClone(job);
    }),
  claimJobsForOrder: (orderId: string, limit: number) =>
    withDb((db) => {
      const now = Date.now();
      const orders = new Map(db.orders.map((order) => [order.id, order]));
      const candidates = db.jobs.filter(
        (job) => job.orderId === orderId && jobIsClaimable(job, orders.get(job.orderId), now),
      );
      candidates.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
      const picked = candidates.slice(0, limit);
      const stamp = new Date().toISOString();
      const lockedUntil = new Date(now + LOCK_MS).toISOString();
      for (const job of picked) {
        job.status = "running";
        job.updatedAt = stamp;
        job.lockedUntil = lockedUntil;
      }
      return structuredClone(picked);
    }),
  claimJobs: (limit: number) =>
    withDb((db) => {
      const now = Date.now();
      const orders = new Map(db.orders.map((order) => [order.id, order]));
      const candidates = db.jobs.filter((job) => jobIsClaimable(job, orders.get(job.orderId), now));
      candidates.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
      const picked = candidates.slice(0, limit);
      const stamp = new Date().toISOString();
      const lockedUntil = new Date(now + LOCK_MS).toISOString();
      for (const job of picked) {
        job.status = "running";
        job.updatedAt = stamp;
        job.lockedUntil = lockedUntil;
      }
      return structuredClone(picked);
    }),
  addEvent: (event: AnalyticsEvent) =>
    withDb((db) => {
      db.events.push({ ...event, storeId: event.storeId ?? DEFAULT_STORE_ID });
    }),
  countEvents: (type: AnalyticsEvent["type"], day?: string, storeId?: string | "all") =>
    withDb(
      (db) =>
        db.events.filter(
          (event) =>
            event.type === type &&
            (!day || londonDay(new Date(event.createdAt)) === day) &&
            (!storeId || storeId === "all" || event.storeId === storeId),
        ).length,
    ),
  addPrint: (print: PrintOrder) =>
    withDb((db) => {
      db.prints.push(print);
    }),
  listPrints: (orderId?: string) =>
    withDb((db) => structuredClone(orderId ? db.prints.filter((print) => print.orderId === orderId) : db.prints)),
  getPrintBySession: (sessionId: string) =>
    withDb((db) => structuredClone(db.prints.find((print) => print.stripeCheckoutSessionId === sessionId) ?? null)),
  updatePrint: (id: string, patch: Partial<PrintOrder>) =>
    withDb((db) => {
      const print = db.prints.find((item) => item.id === id);
      if (!print) throw new Error("Print order not found");
      Object.assign(print, patch);
      return structuredClone(print);
    }),
  addPreorder: (preorder: Preorder) =>
    withDb((db) => {
      db.preorders.push({ ...preorder, storeId: preorder.storeId ?? DEFAULT_STORE_ID });
    }),
  getPreorderBySession: (sessionId: string) =>
    withDb((db) => structuredClone(db.preorders.find((item) => item.stripeCheckoutSessionId === sessionId) ?? null)),
  listPreorders: (storeId?: string | "all") =>
    withDb((db) =>
      structuredClone(
        [...db.preorders]
          .filter((row) => !storeId || storeId === "all" || row.storeId === storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    ),
  updatePreorder: (id: string, patch: Partial<Preorder>) =>
    withDb((db) => {
      const preorder = db.preorders.find((item) => item.id === id);
      if (!preorder) throw new Error("Pre-order not found");
      Object.assign(preorder, patch);
      return structuredClone(preorder);
    }),
  hitRateLimit: (key: string, limit: number, windowMs: number) =>
    withDb((db) => {
      const now = Date.now();
      db.rateLimits = db.rateLimits.filter((row) => Date.parse(row.resetAt) > now);
      let row = db.rateLimits.find((item) => item.key === key);
      if (!row) {
        row = { key, count: 0, resetAt: new Date(now + windowMs).toISOString() };
        db.rateLimits.push(row);
      }
      if (row.count >= limit) return { ok: false as const, remaining: 0 };
      row.count += 1;
      return { ok: true as const, remaining: limit - row.count };
    }),
  addSpend: (gbp: number, storeId = DEFAULT_STORE_ID) =>
    withDb((db) => {
      const day = londonDay();
      let row = db.spend.find((item) => item.day === day && item.storeId === storeId);
      if (!row) {
        row = { storeId, day, gbp: 0 };
        db.spend.push(row);
      }
      row.gbp = Math.round((row.gbp + gbp) * 10000) / 10000;
      return row.gbp;
    }),
  todaySpend: (storeId: string | "all" = DEFAULT_STORE_ID) =>
    withDb((db) => {
      const day = londonDay();
      if (storeId === "all") {
        return db.spend.filter((item) => item.day === day).reduce((sum, item) => sum + item.gbp, 0);
      }
      return db.spend.find((item) => item.day === day && item.storeId === storeId)?.gbp ?? 0;
    }),
  listCatalogueProductOverrides: (storeId: string) =>
    withDb((db) => structuredClone(db.catalogueProducts.filter((p) => p.storeId === storeId))),
  recordAdminLogin: (email: string, ip: string) =>
    withDb((db) => {
      const row = { id: randomUUID(), email, ip, createdAt: new Date().toISOString() };
      db.adminLoginEvents.unshift(row);
      if (db.adminLoginEvents.length > 200) db.adminLoginEvents.length = 200;
    }),
  listAdminLoginEvents: (limit = 20) =>
    withDb((db) => structuredClone(db.adminLoginEvents.slice(0, limit))),
  upsertCatalogueProduct: (product: CatalogueProduct) =>
    withDb((db) => {
      const idx = db.catalogueProducts.findIndex((p) => p.storeId === product.storeId && p.id === product.id);
      if (idx >= 0) db.catalogueProducts[idx] = product;
      else db.catalogueProducts.push(product);
      return structuredClone(product);
    }),
  createShopOrder: (order: ShopOrder) =>
    withDb((db) => {
      db.shopOrders.push(order);
      return structuredClone(order);
    }),
  getShopOrder: (id: string) => withDb((db) => structuredClone(db.shopOrders.find((o) => o.id === id) ?? null)),
  getShopOrderBySession: (sessionId: string) =>
    withDb((db) => structuredClone(db.shopOrders.find((o) => o.stripeCheckoutSessionId === sessionId) ?? null)),
  updateShopOrder: (id: string, patch: Partial<ShopOrder>) =>
    withDb((db) => {
      const row = db.shopOrders.find((o) => o.id === id);
      if (!row) throw new Error("Shop order not found");
      Object.assign(row, patch);
      return structuredClone(row);
    }),
  listShopOrders: (storeId?: string | "all", status?: string) =>
    withDb((db) =>
      structuredClone(
        db.shopOrders
          .filter((o) => (!storeId || storeId === "all" || o.storeId === storeId) && (!status || o.status === status))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    ),
  addSupplierBatch: (batch: SupplierBatchExport) =>
    withDb((db) => {
      db.supplierBatches.push(batch);
      return structuredClone(batch);
    }),
  listSupplierBatches: (storeId: string) =>
    withDb((db) => structuredClone(db.supplierBatches.filter((b) => b.storeId === storeId))),
  updateSupplierBatch: (id: string, patch: Partial<SupplierBatchExport>) =>
    withDb((db) => {
      const row = db.supplierBatches.find((b) => b.id === id);
      if (!row) throw new Error("Batch not found");
      Object.assign(row, patch);
      return structuredClone(row);
    }),
  upsertHandPaintedOrder: (row: HandPaintedOrderRow) =>
    withDb((db) => {
      const idx = db.handPaintedOrders.findIndex((h) => h.orderId === row.orderId);
      if (idx >= 0) db.handPaintedOrders[idx] = row;
      else db.handPaintedOrders.push(row);
      return structuredClone(row);
    }),
  getHandPaintedOrder: (orderId: string) =>
    withDb((db) => structuredClone(db.handPaintedOrders.find((h) => h.orderId === orderId) ?? null)),
  getHandPaintedByProofToken: (token: string) =>
    withDb((db) => structuredClone(db.handPaintedOrders.find((h) => h.proofToken === token) ?? null)),
  listHandPaintedOrders: (storeId?: string | "all") =>
    withDb((db) =>
      structuredClone(
        db.handPaintedOrders.filter((h) => !storeId || storeId === "all" || h.storeId === storeId),
      ),
    ),
};
