import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { AnalyticsEvent, Asset, Database, Job, Order, Preorder, PrintOrder, Settings } from "@/lib/domain";
import { jobIsClaimable, LOCK_MS } from "@/lib/queue";
import { londonDay } from "@/lib/runtime";

const root = path.join(process.cwd(), ".data");
const file = path.join(root, "db.json");

const defaultSettings = (): Settings => ({
  themeMode: "auto",
  activeThemeId: "halloween",
  salesPaused: false,
  queueHalted: false,
  haltReason: null,
  haltNotifiedOn: null,
});

function emptyDb(): Database {
  return {
    orders: [],
    assets: [],
    jobs: [],
    events: [],
    prints: [],
    preorders: [],
    settings: defaultSettings(),
    rateLimits: [],
    spend: [],
  };
}

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Database> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Database;
    return {
      ...emptyDb(),
      ...parsed,
      orders: (parsed.orders ?? []).map((order) => ({
        ...order,
        offer: order.offer ?? "one_off",
        stripeSubscriptionId: order.stripeSubscriptionId ?? null,
        subscriptionStatus: order.subscriptionStatus ?? null,
      })),
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
  await mkdir(root, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
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

export const jsonStore = {
  getSettings: () => withDb((db) => structuredClone(db.settings)),
  updateSettings: (patch: Partial<Settings>) =>
    withDb((db) => {
      db.settings = { ...db.settings, ...patch };
      return structuredClone(db.settings);
    }),
  createOrder: (order: Order) =>
    withDb((db) => {
      db.orders.push(order);
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
  getOrderByReferralCode: (code: string) =>
    withDb((db) =>
      structuredClone(db.orders.find((item) => item.ownReferralCode.toLowerCase() === code.toLowerCase()) ?? null),
    ),
  getOrderBySubscription: (subscriptionId: string) =>
    withDb((db) => structuredClone(db.orders.find((item) => item.stripeSubscriptionId === subscriptionId) ?? null)),
  listOrders: () =>
    withDb((db) => structuredClone([...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))),
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
      db.events.push(event);
    }),
  countEvents: (type: AnalyticsEvent["type"], day?: string) =>
    withDb((db) => db.events.filter((event) => event.type === type && (!day || londonDay(new Date(event.createdAt)) === day)).length),
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
      db.preorders.push(preorder);
    }),
  getPreorderBySession: (sessionId: string) =>
    withDb((db) => structuredClone(db.preorders.find((item) => item.stripeCheckoutSessionId === sessionId) ?? null)),
  listPreorders: () => withDb((db) => structuredClone([...db.preorders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))),
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
  addSpend: (gbp: number) =>
    withDb((db) => {
      const day = londonDay();
      let row = db.spend.find((item) => item.day === day);
      if (!row) {
        row = { day, gbp: 0 };
        db.spend.push(row);
      }
      row.gbp = Math.round((row.gbp + gbp) * 10000) / 10000;
      return row.gbp;
    }),
  todaySpend: () => withDb((db) => db.spend.find((item) => item.day === londonDay())?.gbp ?? 0),
};
