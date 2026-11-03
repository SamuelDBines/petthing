import type { DailyRollupMetrics, FunnelStep, VisitorSessionRow } from "@/lib/analytics/types";

export const INTERACTION_EVENT_TYPES = new Set([
  "photo_upload",
  "preview_generated",
  "checkout_started",
  "paid",
  "upsell_add",
  "preview_failed",
  "checkout_expired",
]);

export function sessionIsBounce(session: Pick<VisitorSessionRow, "pageviewCount" | "durationMs" | "hadInteraction" | "maxScrollDepth">) {
  const engaged =
    session.hadInteraction || session.maxScrollDepth >= 25 || session.durationMs >= 10_000;
  return session.pageviewCount <= 1 && !engaged;
}

export function countVisitorsByNewReturning(sessions: VisitorSessionRow[]) {
  const seen = new Set<string>();
  let newVisitors = 0;
  let returningVisitors = 0;
  let returningSessions = 0;
  for (const session of sessions) {
    if (!seen.has(session.visitorId)) {
      seen.add(session.visitorId);
      if (session.isNewVisitor) newVisitors += 1;
      else returningVisitors += 1;
    }
    if (!session.isNewVisitor) returningSessions += 1;
  }
  return {
    uniqueVisitors: seen.size,
    newVisitors,
    returningVisitors,
    returningSessions,
  };
}

export function clampRate(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0) return null;
  const rate = numerator / denominator;
  if (!Number.isFinite(rate)) return null;
  return Math.min(Math.max(rate, 0), 1);
}

export function computeFunnelConversions(
  funnel: Record<FunnelStep, number>,
  order: readonly FunnelStep[],
): { step: FunnelStep; count: number; conversionFromPrevious: number | null; conversionFromLanding: number | null }[] {
  const landing = funnel.landing ?? 0;
  return order.map((step, index) => {
    const count = funnel[step] ?? 0;
    let previousWithData = 0;
    for (let i = index - 1; i >= 0; i -= 1) {
      const prev = funnel[order[i]] ?? 0;
      if (prev > 0) {
        previousWithData = prev;
        break;
      }
    }
    return {
      step,
      count,
      conversionFromPrevious: index === 0 ? null : clampRate(count, previousWithData),
      conversionFromLanding: clampRate(count, landing),
    };
  });
}

export function avgSessionDurationMs(sessions: VisitorSessionRow[]) {
  if (!sessions.length) return 0;
  const total = sessions.reduce((sum, session) => sum + effectiveSessionDurationMs(session), 0);
  return Math.round(total / sessions.length);
}

export function effectiveSessionDurationMs(session: VisitorSessionRow) {
  if (session.durationMs > 0) return session.durationMs;
  if (session.endedAt) {
    return Math.max(0, Date.parse(session.endedAt) - Date.parse(session.startedAt));
  }
  return 0;
}

export function pagesPerSession(sessions: VisitorSessionRow[]) {
  if (!sessions.length) return 0;
  const total = sessions.reduce((sum, session) => sum + session.pageviewCount, 0);
  return Math.round((total / sessions.length) * 10) / 10;
}

export function bucketCounts(rows: { key: string; count: number }[], limit = 8) {
  return [...rows].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function mergeMetricMaps(
  target: Record<string, number>,
  source: Record<string, number>,
) {
  for (const [key, count] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + count;
  }
}

export function emptyExtendedRollupExtras(): Pick<
  DailyRollupMetrics,
  | "returningSessions"
  | "excludedSessions"
  | "avgSessionDurationMs"
  | "pagesPerSession"
  | "referrers"
  | "utmSources"
  | "utmCampaigns"
  | "paidTrafficSessions"
  | "devices"
  | "browsers"
  | "countries"
  | "hourly"
  | "revenueBySource"
> {
  return {
    returningSessions: 0,
    excludedSessions: 0,
    avgSessionDurationMs: 0,
    pagesPerSession: 0,
    referrers: {},
    utmSources: {},
    utmCampaigns: {},
    paidTrafficSessions: 0,
    devices: {},
    browsers: {},
    countries: {},
    hourly: {},
    revenueBySource: {},
  };
}
