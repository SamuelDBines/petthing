import { and, eq, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as schema from "@/db/schema";
import type { AnalyticsCollectContext, VisitorCollectPayload } from "@/lib/analytics/types";
import type { VisitorEventRow, VisitorSessionRow } from "@/lib/analytics/types";
import { INTERACTION_EVENT_TYPES } from "@/lib/analytics/metrics";
import { mergeRollups, rollupDay } from "@/lib/analytics/rollup";
import {
  browserFromUserAgent,
  classifyTraffic,
  paidClickIds,
  referrerDomain,
} from "@/lib/analytics/traffic";
import { getSql } from "@/lib/db/client";
import { drizzle } from "drizzle-orm/postgres-js";
import { londonDay } from "@/lib/runtime";

const { visitorSessions, visitorEvents, analyticsDailyRollups } = schema;

function adb() {
  return drizzle(getSql(), { schema });
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toSession(row: typeof visitorSessions.$inferSelect): VisitorSessionRow {
  return {
    id: row.id,
    storeId: row.storeId,
    visitorId: row.visitorId,
    consentLevel: row.consentLevel as VisitorSessionRow["consentLevel"],
    isNewVisitor: row.isNewVisitor,
    referrer: row.referrer,
    referrerDomain: row.referrerDomain ?? referrerDomain(row.referrer),
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    gclid: row.gclid,
    fbclid: row.fbclid,
    ttclid: row.ttclid,
    landingPath: row.landingPath,
    exitPath: row.exitPath,
    deviceType: row.deviceType,
    browser: row.browser,
    countryCode: row.countryCode,
    startedAt: iso(row.startedAt)!,
    endedAt: iso(row.endedAt),
    pageviewCount: row.pageviewCount,
    bounced: row.bounced,
    hadInteraction: row.hadInteraction,
    durationMs: row.durationMs,
    maxScrollDepth: row.maxScrollDepth,
    rageClicks: row.rageClicks,
    jsErrors: row.jsErrors,
    slowLoads: row.slowLoads,
    excludedFromMetrics: row.excludedFromMetrics,
    exclusionReason: row.exclusionReason,
  };
}

function toVisitorEvent(row: typeof visitorEvents.$inferSelect): VisitorEventRow {
  return {
    id: row.id,
    storeId: row.storeId,
    sessionId: row.sessionId,
    visitorId: row.visitorId,
    eventType: row.eventType,
    path: row.path,
    metadata: row.metadata ?? {},
    createdAt: iso(row.createdAt)!,
  };
}

function classifyReferrer(referrer?: string) {
  if (!referrer) return null;
  const lower = referrer.toLowerCase();
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("pinterest")) return "pinterest";
  if (lower.includes("twitter") || lower.includes("x.com")) return "x";
  return referrer.slice(0, 200);
}

function hashBucket(path: string) {
  let hash = 0;
  for (let i = 0; i < path.length; i++) hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
  return hash % 1000;
}

function clickIdsFromPayload(payload: VisitorCollectPayload) {
  const fromUtm = paidClickIds(payload.utm ?? {});
  return {
    gclid: payload.clickIds?.gclid ?? fromUtm.gclid ?? null,
    fbclid: payload.clickIds?.fbclid ?? fromUtm.fbclid ?? null,
    ttclid: payload.clickIds?.ttclid ?? fromUtm.ttclid ?? null,
  };
}

export async function collectVisitorAnalytics(
  storeId: string,
  payload: VisitorCollectPayload,
  context: AnalyticsCollectContext = {},
) {
  const now = new Date();
  const countryCode = context.countryCode ?? null;
  const userAgent = payload.userAgent ?? context.userAgent ?? null;
  const traffic = classifyTraffic({
    userAgent,
    internalCheckHeader: context.internalCheckHeader,
    ip: context.ip,
    excludeCookie: context.excludeCookie,
    isAdmin: context.isAdmin,
  });
  const clicks = clickIdsFromPayload(payload);
  const visitorId =
    payload.consent === "analytics" && payload.visitorId
      ? payload.visitorId
      : `agg:${storeId}:${londonDay(now)}:${hashBucket(payload.path)}`;

  let sessionId = payload.sessionId;
  let sessionRow: VisitorSessionRow | null = null;
  if (sessionId) {
    const [row] = await adb().select().from(visitorSessions).where(eq(visitorSessions.id, sessionId)).limit(1);
    sessionRow = row ? toSession(row) : null;
  }

  if (!sessionRow) {
    sessionId = randomUUID();
    const prior = await adb()
      .select({ id: visitorSessions.id })
      .from(visitorSessions)
      .where(and(eq(visitorSessions.storeId, storeId), eq(visitorSessions.visitorId, visitorId)))
      .limit(1);
    const isNew = !prior.length;
    const hadInteraction = Boolean(payload.event && INTERACTION_EVENT_TYPES.has(payload.event.type));
    await adb().insert(visitorSessions).values({
      id: sessionId,
      storeId,
      visitorId,
      consentLevel: payload.consent,
      isNewVisitor: isNew,
      referrer: classifyReferrer(payload.referrer),
      referrerDomain: referrerDomain(payload.referrer),
      utmSource: payload.utm?.utm_source ?? null,
      utmMedium: payload.utm?.utm_medium ?? null,
      utmCampaign: payload.utm?.utm_campaign ?? null,
      gclid: clicks.gclid,
      fbclid: clicks.fbclid,
      ttclid: clicks.ttclid,
      landingPath: payload.path,
      exitPath: payload.path,
      deviceType: payload.deviceType ?? null,
      browser: browserFromUserAgent(userAgent),
      countryCode,
      startedAt: now,
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
      userAgent: userAgent?.slice(0, 500) ?? null,
    });
    await recordFunnelEvent(storeId, sessionId, visitorId, payload.path, "landing");
  } else {
    const nextPageviews = sessionRow.pageviewCount + 1;
    const hadInteraction =
      sessionRow.hadInteraction ||
      Boolean(payload.event && INTERACTION_EVENT_TYPES.has(payload.event.type));
    const durationMs = Math.max(payload.durationMs ?? 0, sessionRow.durationMs);
    const bounced = nextPageviews <= 1 && !hadInteraction && durationMs < 10_000;
    await adb()
      .update(visitorSessions)
      .set({
        exitPath: payload.path,
        pageviewCount: nextPageviews,
        bounced,
        hadInteraction,
        durationMs,
        maxScrollDepth: sql`greatest(${visitorSessions.maxScrollDepth}, ${payload.scrollDepth ?? 0})`,
        rageClicks: sql`${visitorSessions.rageClicks} + ${payload.rageClick ? 1 : 0}`,
        jsErrors: sql`${visitorSessions.jsErrors} + ${payload.jsError ? 1 : 0}`,
        slowLoads: sql`${visitorSessions.slowLoads} + ${payload.slowLoadMs && payload.slowLoadMs > 4000 ? 1 : 0}`,
        endedAt: payload.leave ? now : sessionRow.endedAt ? new Date(sessionRow.endedAt) : null,
        excludedFromMetrics: traffic.excluded || sessionRow.excludedFromMetrics,
        exclusionReason: traffic.reason ?? sessionRow.exclusionReason,
      })
      .where(eq(visitorSessions.id, sessionId!));
  }

  if (payload.event) {
    await recordFunnelEvent(storeId, sessionId!, visitorId, payload.path, payload.event.type, payload.event.metadata);
    if (INTERACTION_EVENT_TYPES.has(payload.event.type)) {
      await adb()
        .update(visitorSessions)
        .set({ hadInteraction: true, bounced: false })
        .where(eq(visitorSessions.id, sessionId!));
    }
  }

  await recomputeRollup(storeId, londonDay(now));
  return { sessionId, visitorId };
}

export async function recordServerFunnelEvent(args: {
  storeId: string;
  eventType: string;
  visitorSessionId?: string | null;
  visitorId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sessionId = args.visitorSessionId ?? null;
  const visitorId = args.visitorId ?? null;
  await recordFunnelEvent(args.storeId, sessionId, visitorId, args.path ?? "/", args.eventType, args.metadata);
  if (sessionId && INTERACTION_EVENT_TYPES.has(args.eventType)) {
    await adb()
      .update(visitorSessions)
      .set({ hadInteraction: true, bounced: false })
      .where(eq(visitorSessions.id, sessionId));
  }
  await recomputeRollup(args.storeId, londonDay());
}

async function recordFunnelEvent(
  storeId: string,
  sessionId: string | null,
  visitorId: string | null,
  path: string,
  type: string,
  metadata?: Record<string, unknown>,
) {
  await adb().insert(visitorEvents).values({
    id: randomUUID(),
    storeId,
    sessionId,
    visitorId,
    eventType: type,
    path,
    metadata: metadata ?? {},
    createdAt: new Date(),
  });
}

export async function recomputeRollup(storeId: string, day: string, includeExcluded = false) {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  const sessions = await adb()
    .select()
    .from(visitorSessions)
    .where(and(eq(visitorSessions.storeId, storeId), gte(visitorSessions.startedAt, start), lte(visitorSessions.startedAt, end)));
  const events = await adb()
    .select()
    .from(visitorEvents)
    .where(and(eq(visitorEvents.storeId, storeId), gte(visitorEvents.createdAt, start), lte(visitorEvents.createdAt, end)));
  const metrics = rollupDay(sessions.map(toSession), events.map(toVisitorEvent), { includeExcluded });
  await adb()
    .insert(analyticsDailyRollups)
    .values({ storeId, day, metrics })
    .onConflictDoUpdate({
      target: [analyticsDailyRollups.storeId, analyticsDailyRollups.day],
      set: { metrics },
    });
}

export async function listRollups(storeId: string | "all", from: string, to: string, includeExcluded = false) {
  if (includeExcluded) {
    return recomputeRollupsLive(storeId, from, to, true);
  }
  if (storeId === "all") {
    const rows = await adb()
      .select()
      .from(analyticsDailyRollups)
      .where(and(gte(analyticsDailyRollups.day, from), lte(analyticsDailyRollups.day, to)));
    const byDay = new Map<string, ReturnType<typeof rollupDay>>();
    for (const row of rows) {
      const day = String(row.day).slice(0, 10);
      const merged = byDay.get(day);
      if (!merged) byDay.set(day, row.metrics as ReturnType<typeof rollupDay>);
      else byDay.set(day, mergeRollups([merged, row.metrics as ReturnType<typeof rollupDay>]));
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, metrics]) => ({ day, metrics }));
  }
  const rows = await adb()
    .select()
    .from(analyticsDailyRollups)
    .where(
      and(
        eq(analyticsDailyRollups.storeId, storeId),
        gte(analyticsDailyRollups.day, from),
        lte(analyticsDailyRollups.day, to),
      ),
    )
    .orderBy(analyticsDailyRollups.day);
  return rows.map((row) => ({ day: String(row.day).slice(0, 10), metrics: row.metrics as ReturnType<typeof rollupDay> }));
}

async function recomputeRollupsLive(storeId: string | "all", from: string, to: string, includeExcluded: boolean) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const sessionWhere =
    storeId === "all"
      ? and(gte(visitorSessions.startedAt, start), lte(visitorSessions.startedAt, end))
      : and(eq(visitorSessions.storeId, storeId), gte(visitorSessions.startedAt, start), lte(visitorSessions.startedAt, end));
  const sessions = await adb().select().from(visitorSessions).where(sessionWhere);
  const eventWhere =
    storeId === "all"
      ? and(gte(visitorEvents.createdAt, start), lte(visitorEvents.createdAt, end))
      : and(eq(visitorEvents.storeId, storeId), gte(visitorEvents.createdAt, start), lte(visitorEvents.createdAt, end));
  const events = await adb().select().from(visitorEvents).where(eventWhere);
  const byDay = new Map<string, ReturnType<typeof rollupDay>>();
  for (const day of daySpan(from, to)) {
    const dayStart = `${day}T00:00:00.000Z`;
    const dayEnd = `${day}T23:59:59.999Z`;
    const daySessions = sessions
      .map(toSession)
      .filter((row) => row.startedAt >= dayStart && row.startedAt <= dayEnd);
    const dayEvents = events
      .map(toVisitorEvent)
      .filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd);
    byDay.set(day, rollupDay(daySessions, dayEvents, { includeExcluded }));
  }
  return [...byDay.entries()].map(([day, metrics]) => ({ day, metrics }));
}

function daySpan(from: string, to: string) {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function countActiveVisitors(storeId: string | "all", includeExcluded = false) {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const whereParts = [gte(visitorSessions.startedAt, since)];
  if (storeId !== "all") whereParts.push(eq(visitorSessions.storeId, storeId));
  if (!includeExcluded) whereParts.push(eq(visitorSessions.excludedFromMetrics, false));
  const rows = await adb()
    .select({ visitorId: visitorSessions.visitorId })
    .from(visitorSessions)
    .where(and(...whereParts));
  return new Set(rows.map((row) => row.visitorId)).size;
}
