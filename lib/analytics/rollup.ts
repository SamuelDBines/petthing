import type { DailyRollupMetrics, FunnelStep, VisitorEventRow, VisitorSessionRow } from "@/lib/analytics/types";

const FUNNEL_STEPS: FunnelStep[] = ["landing", "photo_upload", "preview_generated", "checkout_started", "paid", "upsell_add"];

export function emptyRollup(): DailyRollupMetrics {
  return {
    uniqueVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    newVisitors: 0,
    returningVisitors: 0,
    pageviews: 0,
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
    signals: { rageClicks: 0, jsErrors: 0, slowLoads: 0, previewFailures: 0, checkoutExpired: 0 },
  };
}

function bumpPair(map: Record<string, { sessions: number; bounces: number }>, key: string, bounced: boolean) {
  const row = map[key] ?? { sessions: 0, bounces: 0 };
  row.sessions += 1;
  if (bounced) row.bounces += 1;
  map[key] = row;
}

export function rollupDay(sessions: VisitorSessionRow[], events: VisitorEventRow[]): DailyRollupMetrics {
  const metrics = emptyRollup();
  const visitors = new Set<string>();
  metrics.sessions = sessions.length;
  for (const session of sessions) {
    visitors.add(session.visitorId);
    metrics.pageviews += session.pageviewCount;
    if (session.isNewVisitor) metrics.newVisitors += 1;
    else metrics.returningVisitors += 1;
    if (session.bounced) metrics.bounceRate += 1;
    bumpPair(metrics.bounceByLanding, session.landingPath, session.bounced);
    bumpPair(metrics.bounceBySource, session.utmSource || session.referrer || "direct", session.bounced);
    bumpPair(metrics.bounceByDevice, session.deviceType || "unknown", session.bounced);
    if (session.exitPath) metrics.exitPages[session.exitPath] = (metrics.exitPages[session.exitPath] ?? 0) + 1;
    metrics.signals.rageClicks += session.rageClicks;
    metrics.signals.jsErrors += session.jsErrors;
    metrics.signals.slowLoads += session.slowLoads;
  }
  metrics.uniqueVisitors = visitors.size;
  metrics.bounceRate = metrics.sessions ? metrics.bounceRate / metrics.sessions : 0;

  for (const event of events) {
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
  const visitors = new Set<string>();
  for (const part of parts) {
    out.sessions += part.sessions;
    out.pageviews += part.pageviews;
    out.newVisitors += part.newVisitors;
    out.returningVisitors += part.returningVisitors;
    out.bounceRate += part.bounceRate * part.sessions;
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
    out.signals.rageClicks += part.signals.rageClicks;
    out.signals.jsErrors += part.signals.jsErrors;
    out.signals.slowLoads += part.signals.slowLoads;
    out.signals.previewFailures += part.signals.previewFailures;
    out.signals.checkoutExpired += part.signals.checkoutExpired;
    out.uniqueVisitors += part.uniqueVisitors;
  }
  out.bounceRate = out.sessions ? out.bounceRate / out.sessions : 0;
  return out;
}
