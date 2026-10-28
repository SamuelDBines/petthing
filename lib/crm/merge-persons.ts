import { createHash } from "crypto";
import type { ShopOrder } from "@/lib/catalogue/types";
import type { Order, Preorder } from "@/lib/domain";
import type {
  PersonOrderRef,
  PersonRow,
  PersonStatus,
  PersonTimelineEvent,
  SignupSource,
  SignupSparkline,
} from "@/lib/crm/types";

export type EmailSignupRow = {
  id: string;
  storeId: string;
  email: string;
  source: SignupSource;
  name: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  excludedFromMetrics: boolean;
  unsubscribedAt: string | null;
  createdAt: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function personKeyFromEmail(email: string) {
  return Buffer.from(normalizeEmail(email), "utf8").toString("base64url");
}

export function emailFromPersonKey(key: string) {
  return Buffer.from(key, "base64url").toString("utf8");
}

function portraitPaidPence(order: Order) {
  if (order.status === "pending_payment" || order.status === "refunded") return 0;
  return order.payments.reduce((sum, payment) => sum + payment.amountPence, 0) || order.amountPence;
}

function shopPaidPence(order: ShopOrder) {
  if (order.status === "pending_payment" || order.status === "cancelled") return 0;
  return order.amountPence;
}

function isPortraitPaid(order: Order) {
  return portraitPaidPence(order) > 0 && order.status !== "refunded";
}

function isShopPaid(order: ShopOrder) {
  return shopPaidPence(order) > 0;
}

function deriveStatus(args: {
  paidCount: number;
  marketingConsent: boolean;
  hasAbandonedCheckout: boolean;
}): PersonStatus {
  if (args.paidCount >= 2) return "repeat_customer";
  if (args.paidCount === 1) return "customer";
  if (args.hasAbandonedCheckout) return "abandoned_checkout";
  if (args.marketingConsent) return "subscriber";
  return "lead";
}

export function mergePersons(args: {
  orders: Order[];
  shopOrders: ShopOrder[];
  preorders: Preorder[];
  signups: EmailSignupRow[];
  suppressed: Set<string>;
  includeExcluded?: boolean;
}): PersonRow[] {
  const map = new Map<string, PersonRow & { orders: PersonOrderRef[]; timeline: PersonTimelineEvent[] }>();

  function ensure(email: string) {
    const key = normalizeEmail(email);
    if (!map.has(key)) {
      map.set(key, {
        email: key,
        name: null,
        storeIds: [],
        firstSeenAt: new Date(0).toISOString(),
        signupSources: [],
        utmSource: null,
        utmCampaign: null,
        referrer: null,
        marketingConsent: false,
        marketingConsentAt: null,
        unsubscribed: false,
        suppressed: args.suppressed.has(key),
        orderCount: 0,
        paidOrderCount: 0,
        totalSpentPence: 0,
        lastOrderAt: null,
        status: "lead",
        excludedFromMetrics: false,
        orders: [],
        timeline: [],
      });
    }
    return map.get(key)!;
  }

  for (const signup of args.signups) {
    if (!args.includeExcluded && signup.excludedFromMetrics) continue;
    const row = ensure(signup.email);
    row.excludedFromMetrics = row.excludedFromMetrics || signup.excludedFromMetrics;
    if (!row.storeIds.includes(signup.storeId)) row.storeIds.push(signup.storeId);
    if (!row.signupSources.includes(signup.source)) row.signupSources.push(signup.source);
    if (signup.name && !row.name) row.name = signup.name;
    if (signup.marketingConsent) {
      row.marketingConsent = true;
      if (!row.marketingConsentAt || signup.marketingConsentAt! < row.marketingConsentAt) {
        row.marketingConsentAt = signup.marketingConsentAt;
      }
    }
    if (signup.unsubscribedAt) row.unsubscribed = true;
    if (!row.utmSource && signup.utmSource) row.utmSource = signup.utmSource;
    if (!row.utmCampaign && signup.utmCampaign) row.utmCampaign = signup.utmCampaign;
    if (!row.referrer && signup.referrer) row.referrer = signup.referrer;
    if (signup.createdAt < row.firstSeenAt || row.firstSeenAt === new Date(0).toISOString()) {
      row.firstSeenAt = signup.createdAt;
    }
    row.timeline.push({
      at: signup.createdAt,
      type: "signup",
      detail: signup.source,
      storeId: signup.storeId,
    });
  }

  for (const order of args.orders) {
    const row = ensure(order.email);
    if (!row.storeIds.includes(order.storeId)) row.storeIds.push(order.storeId);
    if (order.cardNames?.trim() && !row.name) row.name = order.cardNames.trim();
    if (!row.utmSource && order.utm?.utm_source) row.utmSource = order.utm.utm_source;
    if (!row.utmCampaign && order.utm?.utm_campaign) row.utmCampaign = order.utm.utm_campaign;
    if (order.createdAt < row.firstSeenAt || row.firstSeenAt === new Date(0).toISOString()) row.firstSeenAt = order.createdAt;
    const paid = portraitPaidPence(order);
    row.orderCount += 1;
    if (isPortraitPaid(order)) {
      row.paidOrderCount += 1;
      row.totalSpentPence += paid;
    }
    if (!row.lastOrderAt || order.createdAt > row.lastOrderAt) row.lastOrderAt = order.createdAt;
    row.orders.push({
      id: order.id,
      storeId: order.storeId,
      kind: "portrait",
      status: order.status,
      amountPence: order.amountPence,
      paidPence: paid,
      createdAt: order.createdAt,
    });
    row.timeline.push({
      at: order.createdAt,
      type: "portrait_order",
      detail: order.status,
      storeId: order.storeId,
    });
    if (!row.signupSources.includes("portrait_order")) row.signupSources.push("portrait_order");
  }

  for (const order of args.shopOrders) {
    const row = ensure(order.email);
    if (!row.storeIds.includes(order.storeId)) row.storeIds.push(order.storeId);
    if (order.createdAt < row.firstSeenAt || row.firstSeenAt === new Date(0).toISOString()) row.firstSeenAt = order.createdAt;
    const paid = shopPaidPence(order);
    row.orderCount += 1;
    if (isShopPaid(order)) {
      row.paidOrderCount += 1;
      row.totalSpentPence += paid;
    }
    if (order.marketingConsent) {
      row.marketingConsent = true;
    }
    if (!row.lastOrderAt || order.createdAt > row.lastOrderAt) row.lastOrderAt = order.createdAt;
    row.orders.push({
      id: order.id,
      storeId: order.storeId,
      kind: "shop",
      status: order.status,
      amountPence: order.amountPence,
      paidPence: paid,
      createdAt: order.createdAt,
    });
    row.timeline.push({
      at: order.createdAt,
      type: "shop_order",
      detail: order.status,
      storeId: order.storeId,
    });
    if (!row.signupSources.includes("shop_checkout")) row.signupSources.push("shop_checkout");
  }

  for (const preorder of args.preorders) {
    const row = ensure(preorder.email);
    if (!row.storeIds.includes(preorder.storeId)) row.storeIds.push(preorder.storeId);
    if (preorder.createdAt < row.firstSeenAt || row.firstSeenAt === new Date(0).toISOString()) row.firstSeenAt = preorder.createdAt;
    row.orderCount += 1;
    if (preorder.status === "paid") {
      row.paidOrderCount += 1;
      row.totalSpentPence += preorder.amountPence;
    }
    row.orders.push({
      id: preorder.id,
      storeId: preorder.storeId,
      kind: "preorder",
      status: preorder.status,
      amountPence: preorder.amountPence,
      paidPence: preorder.status === "paid" ? preorder.amountPence : 0,
      createdAt: preorder.createdAt,
    });
    row.timeline.push({
      at: preorder.createdAt,
      type: "christmas_preorder",
      detail: preorder.status,
      storeId: preorder.storeId,
    });
    if (!row.signupSources.includes("christmas_preorder")) row.signupSources.push("christmas_preorder");
  }

  const people: PersonRow[] = [];
  for (const [, row] of map) {
    const hasAbandonedCheckout = row.orders.some(
      (order) => order.kind === "shop" && order.status === "pending_payment",
    );
    row.status = deriveStatus({
      paidCount: row.paidOrderCount,
      marketingConsent: row.marketingConsent && !row.unsubscribed,
      hasAbandonedCheckout,
    });
    row.timeline.sort((a, b) => a.at.localeCompare(b.at));
    row.storeIds.sort();
    const { orders: _o, timeline: _t, ...person } = row;
    people.push(person);
  }
  return people.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
}

export function mergePersonDetail(email: string, args: Parameters<typeof mergePersons>[0]) {
  const key = normalizeEmail(email);
  const full = mergePersons(args).find((row) => row.email === key);
  if (!full) return null;
  const orders = args.orders
    .filter((order) => normalizeEmail(order.email) === key)
    .map(
      (order): PersonOrderRef => ({
        id: order.id,
        storeId: order.storeId,
        kind: "portrait",
        status: order.status,
        amountPence: order.amountPence,
        paidPence: portraitPaidPence(order),
        createdAt: order.createdAt,
      }),
    );
  const shop = args.shopOrders
    .filter((order) => normalizeEmail(order.email) === key)
    .map(
      (order): PersonOrderRef => ({
        id: order.id,
        storeId: order.storeId,
        kind: "shop",
        status: order.status,
        amountPence: order.amountPence,
        paidPence: shopPaidPence(order),
        createdAt: order.createdAt,
      }),
    );
  const pre = args.preorders
    .filter((order) => normalizeEmail(order.email) === key)
    .map(
      (order): PersonOrderRef => ({
        id: order.id,
        storeId: order.storeId,
        kind: "preorder",
        status: order.status,
        amountPence: order.amountPence,
        paidPence: order.status === "paid" ? order.amountPence : 0,
        createdAt: order.createdAt,
      }),
    );
  const timeline: PersonTimelineEvent[] = [];
  for (const signup of args.signups.filter((row) => normalizeEmail(row.email) === key)) {
    timeline.push({ at: signup.createdAt, type: "signup", detail: signup.source, storeId: signup.storeId });
  }
  for (const order of [...orders, ...shop, ...pre]) {
    timeline.push({
      at: order.createdAt,
      type: `${order.kind}_order`,
      detail: order.status,
      storeId: order.storeId,
    });
  }
  timeline.sort((a, b) => b.at.localeCompare(a.at));
  return { ...full, orders: [...orders, ...shop, ...pre], timeline };
}

export function signupSparkline(signups: EmailSignupRow[], includeExcluded = false): SignupSparkline {
  const rows = signups.filter((row) => includeExcluded || !row.excludedFromMetrics);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayMs = 86_400_000;
  const seriesMap = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * dayMs).toISOString().slice(0, 10);
    seriesMap.set(day, 0);
  }
  let todayCount = 0;
  let last7 = 0;
  let last30 = 0;
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    if (seriesMap.has(day)) seriesMap.set(day, (seriesMap.get(day) ?? 0) + 1);
    const age = now.getTime() - Date.parse(row.createdAt);
    if (day === today) todayCount += 1;
    if (age <= 7 * dayMs) last7 += 1;
    if (age <= 30 * dayMs) last30 += 1;
  }
  return {
    today: todayCount,
    last7d: last7,
    last30d: last30,
    series: [...seriesMap.entries()].map(([day, count]) => ({ day, count })),
  };
}

export function hashIpForDisplay(ip: string) {
  return createHash("sha256").update(`admin-audit:${ip}`).digest("hex").slice(0, 12);
}
