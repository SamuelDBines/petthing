import type { DailyRollupMetrics, FunnelStep, VisitorEventRow, VisitorSessionRow } from "@/lib/analytics/types";
import {
  avgSessionDurationMs,
  countVisitorsByNewReturning,
  pagesPerSession,
  sessionIsBounce,
} from "@/lib/analytics/metrics";
import { isPaidTraffic } from "@/lib/analytics/traffic";

const FUNNEL_STEPS: FunnelStep[] = ["landing", "photo_upload", "preview_generated", "checkout_started", "paid", "upsell_add"];

export function emptyRollup(): DailyRollupMetrics {
  return {
    uniqueVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    newVisitors: 0,
    returningVisitors: 0,
    returningSessions: 0,
    excludedSessions: 0,
    pageviews: 0,
    avgSessionDurationMs: 0,
    pagesPerSession: 0,
    paidTrafficSessions: 0,
    funnel: FUNNEL_STEPS.reduce(
      (acc, step) => {
        acc[step] = 0;
        return acc;
      },
      {} as Record<FunnelStep, number>,
    ),
    bounceByLanding: {},
    bounceBySource: {},
    bounceByDevice: {},
    exitPages: {},
    referrers: {},
    utmSources: {},
    utmCampaigns: {},
    devices: {},
    browsers: {},
    countries: {},
    hourly: {},
    revenueBySource: {},
    signals: { rageClicks: 0, jsErrors: 0, slowLoads: 0, previewFailures: 0, checkoutExpired: 0 },
  };
}

function bumpPair(map: Record<string, { sessions: number; bounces: number }>, key: string, bounced: boolean) {
  const row = map[key] ?? { sessions: 0, bounces: 0 };
  row.sessions += 1;
  if (bounced) row.bounces += 1;
  map[key] = row;
}

function hourKey(iso: string) {
  return iso.slice(11, 13);
}

export function rollupDay(
  sessions: VisitorSessionRow[],
  events: VisitorEventRow[],
  options?: { includeExcluded?: boolean },
): DailyRollupMetrics {
  const metrics = emptyRollup();
  const includeExcluded = options?.includeExcluded ?? false;
  const counted = sessions.filter((session) => includeExcluded || !session.excludedFromMetrics);
  metrics.excludedSessions = sessions.filter((session) => session.excludedFromMetrics).length;

  const visitorCounts = countVisitorsByNewReturning(counted);
  metrics.sessions = counted.length;
  metrics.uniqueVisitors = visitorCounts.uniqueVisitors;
  metrics.newVisitors = visitorCounts.newVisitors;
  metrics.returningVisitors = visitorCounts.returningVisitors;
  metrics.returningSessions = visitorCounts.returningSessions;
  metrics.avgSessionDurationMs = avgSessionDurationMs(counted);
  metrics.pagesPerSession = pagesPerSession(counted);

  let bounces = 0;
  for (const session of counted) {
    const bounced = session.bounced ?? sessionIsBounce(session);
    metrics.pageviews += session.pageviewCount;
    if (bounced) bounces += 1;
    bumpPair(metrics.bounceByLanding, session.landingPath, bounced);
    const source = session.utmSource || session.referrerDomain || session.referrer || "direct";
    bumpPair(metrics.bounceBySource, source, bounced);
    bumpPair(metrics.bounceByDevice, session.deviceType || "unknown", bounced);
    if (session.exitPath) metrics.exitPages[session.exitPath] = (metrics.exitPages[session.exitPath] ?? 0) + 1;
    metrics.referrers[session.referrerDomain || "direct"] = (metrics.referrers[session.referrerDomain || "direct"] ?? 0) + 1;
    if (session.utmSource) metrics.utmSources[session.utmSource] = (metrics.utmSources[session.utmSource] ?? 0) + 1;
    if (session.utmCampaign) {
      const key = `${session.utmSource || "unknown"} · ${session.utmCampaign}`;
      metrics.utmCampaigns[key] = (metrics.utmCampaigns[key] ?? 0) + 1;
    }
    metrics.devices[session.deviceType || "unknown"] = (metrics.devices[session.deviceType || "unknown"] ?? 0) + 1;
    metrics.browsers[session.browser || "unknown"] = (metrics.browsers[session.browser || "unknown"] ?? 0) + 1;
    metrics.countries[session.countryCode || "ZZ"] = (metrics.countries[session.countryCode || "ZZ"] ?? 0) + 1;
    metrics.hourly[hourKey(session.startedAt)] = (metrics.hourly[hourKey(session.startedAt)] ?? 0) + 1;
    if (
      isPaidTraffic({
        gclid: session.gclid,
        fbclid: session.fbclid,
        ttclid: session.ttclid,
        utmMedium: session.utmMedium,
      })
    ) {
      metrics.paidTrafficSessions += 1;
    }
    metrics.signals.rageClicks += session.rageClicks;
    metrics.signals.jsErrors += session.jsErrors;
    metrics.signals.slowLoads += session.slowLoads;
  }
  metrics.bounceRate = metrics.sessions ? bounces / metrics.sessions : 0;

  for (const event of events) {
    if (!includeExcluded && event.sessionId) {
      const session = sessions.find((row) => row.id === event.sessionId);
      if (session?.excludedFromMetrics) continue;
    }
    if (FUNNEL_STEPS.includes(event.eventType as FunnelStep)) {
      metrics.funnel[event.eventType as FunnelStep] += 1;
    }
    if (event.eventType === "preview_failed") metrics.signals.previewFailures += 1;
    if (event.eventType === "checkout_expired") metrics.signals.checkoutExpired += 1;
  }
  return metrics;
}

export function mergeRollups(parts: DailyRollupMetrics[]): DailyRollupMetrics {
  const out = emptyRollup();
  for (const part of parts) {
    out.sessions += part.sessions;
    out.pageviews += part.pageviews;
    out.newVisitors += part.newVisitors;
    out.returningVisitors += part.returningVisitors;
    out.returningSessions += part.returningSessions;
    out.excludedSessions += part.excludedSessions;
    out.avgSessionDurationMs += part.avgSessionDurationMs * part.sessions;
    out.pagesPerSession += part.pagesPerSession * part.sessions;
    out.paidTrafficSessions += part.paidTrafficSessions;
    out.bounceRate += part.bounceRate * part.sessions;
    out.uniqueVisitors += part.uniqueVisitors;
    for (const step of FUNNEL_STEPS) out.funnel[step] += part.funnel[step];
    for (const [key, row] of Object.entries(part.bounceByLanding)) {
      bumpPair(out.bounceByLanding, key, false);
      out.bounceByLanding[key].sessions += row.sessions;
      out.bounceByLanding[key].bounces += row.bounces;
    }
    for (const [key, row] of Object.entries(part.bounceBySource)) {
      bumpPair(out.bounceBySource, key, false);
      out.bounceBySource[key].sessions += row.sessions;
      out.bounceBySource[key].bounces += row.bounces;
    }
    for (const [key, row] of Object.entries(part.bounceByDevice)) {
      bumpPair(out.bounceByDevice, key, false);
      out.bounceByDevice[key].sessions += row.sessions;
      out.bounceByDevice[key].bounces += row.bounces;
    }
    for (const [path, count] of Object.entries(part.exitPages)) {
      out.exitPages[path] = (out.exitPages[path] ?? 0) + count;
    }
    for (const [key, count] of Object.entries(part.referrers)) out.referrers[key] = (out.referrers[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.utmSources)) out.utmSources[key] = (out.utmSources[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.utmCampaigns)) out.utmCampaigns[key] = (out.utmCampaigns[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.devices)) out.devices[key] = (out.devices[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.browsers)) out.browsers[key] = (out.browsers[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.countries)) out.countries[key] = (out.countries[key] ?? 0) + count;
    for (const [key, count] of Object.entries(part.hourly)) out.hourly[key] = (out.hourly[key] ?? 0) + count;
    for (const [key, row] of Object.entries(part.revenueBySource)) {
      const current = out.revenueBySource[key] ?? { orders: 0, revenuePence: 0 };
      current.orders += row.orders;
      current.revenuePence += row.revenuePence;
      out.revenueBySource[key] = current;
    }
    out.signals.rageClicks += part.signals.rageClicks;
    out.signals.jsErrors += part.signals.jsErrors;
    out.signals.slowLoads += part.signals.slowLoads;
    out.signals.previewFailures += part.signals.previewFailures;
    out.signals.checkoutExpired += part.signals.checkoutExpired;
  }
  out.bounceRate = out.sessions ? out.bounceRate / out.sessions : 0;
  out.avgSessionDurationMs = out.sessions ? Math.round(out.avgSessionDurationMs / out.sessions) : 0;
  out.pagesPerSession = out.sessions ? Math.round((out.pagesPerSession / out.sessions) * 10) / 10 : 0;
  return out;
}
