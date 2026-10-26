import { and, eq, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as schema from "@/db/schema";
import type { VisitorCollectPayload } from "@/lib/analytics/types";
import type { VisitorEventRow, VisitorSessionRow } from "@/lib/analytics/types";
import { mergeRollups, rollupDay } from "@/lib/analytics/rollup";
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
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    landingPath: row.landingPath,
    exitPath: row.exitPath,
    deviceType: row.deviceType,
    countryCode: row.countryCode,
    startedAt: iso(row.startedAt)!,
    endedAt: iso(row.endedAt),
    pageviewCount: row.pageviewCount,
    bounced: row.bounced,
    durationMs: row.durationMs,
    maxScrollDepth: row.maxScrollDepth,
    rageClicks: row.rageClicks,
    jsErrors: row.jsErrors,
    slowLoads: row.slowLoads,
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

export async function collectVisitorAnalytics(storeId: string, payload: VisitorCollectPayload, countryCode?: string | null) {
  const now = new Date();
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
    await adb().insert(visitorSessions).values({
      id: sessionId,
      storeId,
      visitorId,
      consentLevel: payload.consent,
      isNewVisitor: isNew,
      referrer: classifyReferrer(payload.referrer),
      utmSource: payload.utm?.utm_source ?? null,
      utmMedium: payload.utm?.utm_medium ?? null,
      utmCampaign: payload.utm?.utm_campaign ?? null,
      landingPath: payload.path,
      exitPath: payload.path,
      deviceType: payload.deviceType ?? null,
      countryCode: countryCode ?? null,
      startedAt: now,
      pageviewCount: 1,
      bounced: true,
      durationMs: payload.durationMs ?? 0,
      maxScrollDepth: payload.scrollDepth ?? 0,
      rageClicks: payload.rageClick ? 1 : 0,
      jsErrors: payload.jsError ? 1 : 0,
      slowLoads: payload.slowLoadMs && payload.slowLoadMs > 4000 ? 1 : 0,
    });
    await recordFunnelEvent(storeId, sessionId, visitorId, payload.path, "landing");
  } else {
    const bounced = (payload.durationMs ?? 0) < 10000 && (payload.scrollDepth ?? 0) < 25 && !payload.event;
    await adb()
      .update(visitorSessions)
      .set({
        exitPath: payload.path,
        pageviewCount: sql`${visitorSessions.pageviewCount} + 1`,
        bounced,
        durationMs: sql`greatest(${visitorSessions.durationMs}, ${payload.durationMs ?? 0})`,
        maxScrollDepth: sql`greatest(${visitorSessions.maxScrollDepth}, ${payload.scrollDepth ?? 0})`,
        rageClicks: sql`${visitorSessions.rageClicks} + ${payload.rageClick ? 1 : 0}`,
        jsErrors: sql`${visitorSessions.jsErrors} + ${payload.jsError ? 1 : 0}`,
        slowLoads: sql`${visitorSessions.slowLoads} + ${payload.slowLoadMs && payload.slowLoadMs > 4000 ? 1 : 0}`,
        endedAt: payload.leave ? now : sessionRow.endedAt ? new Date(sessionRow.endedAt) : null,
      })
      .where(eq(visitorSessions.id, sessionId!));
  }

  if (payload.event) {
    await recordFunnelEvent(storeId, sessionId!, visitorId, payload.path, payload.event.type, payload.event.metadata);
  }

  await recomputeRollup(storeId, londonDay(now));
  return { sessionId, visitorId };
}

async function recordFunnelEvent(
  storeId: string,
  sessionId: string,
  visitorId: string,
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

function hashBucket(path: string) {
  let hash = 0;
  for (let i = 0; i < path.length; i++) hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
  return hash % 1000;
}

export async function recomputeRollup(storeId: string, day: string) {
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
  const metrics = rollupDay(sessions.map(toSession), events.map(toVisitorEvent));
  await adb()
    .insert(analyticsDailyRollups)
    .values({ storeId, day, metrics })
    .onConflictDoUpdate({
      target: [analyticsDailyRollups.storeId, analyticsDailyRollups.day],
      set: { metrics },
    });
}

export async function listRollups(storeId: string | "all", from: string, to: string) {
  if (storeId === "all") {
    const rows = await adb()
      .select()
      .from(analyticsDailyRollups)
      .where(and(gte(analyticsDailyRollups.day, from), lte(analyticsDailyRollups.day, to)));
    const byDay = new Map<string, ReturnType<typeof rollupDay>>();
    for (const row of rows) {
      const day = String(row.day).slice(0, 10);
      const merged = byDay.get(day);
      if (!merged) byDay.set(day, row.metrics);
      else byDay.set(day, mergeRollups([merged, row.metrics]));
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
  return rows.map((row) => ({ day: String(row.day).slice(0, 10), metrics: row.metrics }));
}
