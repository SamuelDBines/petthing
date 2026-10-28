import type { AnalyticsDashboard, DailyRollupMetrics, FunnelStep, MetricDelta } from "@/lib/analytics/types";
import type { Order as DomainOrder } from "@/lib/domain";
import { funnelStepLabel } from "@/lib/analytics/labels";
import { clampRate, computeFunnelConversions } from "@/lib/analytics/metrics";
import { attachRevenueToRollups, revenueSummary } from "@/lib/analytics/revenue";
import { emptyRollup, mergeRollups } from "@/lib/analytics/rollup";
import { isPaidTraffic } from "@/lib/analytics/traffic";

const FUNNEL_ORDER: FunnelStep[] = ["landing", "photo_upload", "preview_generated", "checkout_started", "paid", "upsell_add"];

function metricDelta(value: number, previous: number): MetricDelta {
  const delta = previous ? (value - previous) / previous : value ? 1 : null;
  return { value, previous, delta };
}

function bounceReasons(metrics: DailyRollupMetrics) {
  const reasons: AnalyticsDashboard["bounceReasons"] = [];
  const steps: { step: string; from: FunnelStep; to: FunnelStep }[] = [
    { step: "Landing → photo", from: "landing", to: "photo_upload" },
    { step: "Photo → preview", from: "photo_upload", to: "preview_generated" },
    { step: "Preview → checkout", from: "preview_generated", to: "checkout_started" },
    { step: "Checkout → paid", from: "checkout_started", to: "paid" },
  ];
  for (const row of steps) {
    const fromCount = metrics.funnel[row.from] ?? 0;
    const toCount = metrics.funnel[row.to] ?? 0;
    if (fromCount < 3) continue;
    const drop = Math.max(fromCount - toCount, 0);
    if (drop <= 0) continue;
    const topLanding = Object.entries(metrics.bounceByLanding)
      .map(([path, stats]) => ({ path, rate: stats.sessions ? stats.bounces / stats.sessions : 0 }))
      .sort((a, b) => b.rate - a.rate)[0];
    reasons.push({
      step: row.step,
      reason: `${funnelStepLabel(row.from)} drop-off`,
      count: drop,
      detail: topLanding ? `Top exit: ${topLanding.path}` : `${Math.round(clampRate(drop, fromCount)! * 100)}% leave`,
    });
  }
  if (metrics.signals.previewFailures > 0) {
    reasons.push({
      step: "Preview",
      reason: "Preview generation failed",
      count: metrics.signals.previewFailures,
      detail: "Create flow errors",
    });
  }
  if (metrics.signals.checkoutExpired > 0) {
    reasons.push({
      step: "Checkout",
      reason: "Checkout expired",
      count: metrics.signals.checkoutExpired,
      detail: "Stripe session expired",
    });
  }
  return reasons.sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildSeries(args: {
  from: string;
  to: string;
  preset: string;
  daily: { day: string; metrics: DailyRollupMetrics }[];
  merged: DailyRollupMetrics;
}) {
  if (args.preset === "today") {
    return Object.entries(args.merged.hourly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, sessions]) => ({ bucket: `${bucket}:00`, uniqueVisitors: sessions, sessions }));
  }
  return args.daily.map((row) => ({
    bucket: row.day,
    uniqueVisitors: row.metrics.uniqueVisitors,
    sessions: row.metrics.sessions,
  }));
}

export function buildDashboard(args: {
  storeId: string | "all";
  from: string;
  to: string;
  preset?: string;
  comparison?: { from: string; to: string; metrics: DailyRollupMetrics };
  includeExcluded?: boolean;
  activeNow?: number;
  daily: { day: string; metrics: DailyRollupMetrics }[];
  orders?: DomainOrder[];
}): AnalyticsDashboard {
  const merged = mergeRollups(args.daily.map((row) => row.metrics));
  if (args.orders?.length) attachRevenueToRollups(merged, args.orders);
  const previous = args.comparison?.metrics ?? emptyRollup();
  const funnelRaw = computeFunnelConversions(merged.funnel, FUNNEL_ORDER);
  const funnel = funnelRaw.map((row, index) => {
    const previousCount = index > 0 ? funnelRaw[index - 1]?.count ?? 0 : row.count;
    const dropOff = Math.max(previousCount - row.count, 0);
    return {
      ...row,
      label: funnelStepLabel(row.step),
      dropOff: index === 0 ? 0 : dropOff,
      dropOffRate: index === 0 ? null : clampRate(dropOff, previousCount),
    };
  });

  const topLandingPages = Object.entries(merged.bounceByLanding)
    .map(([path, row]) => ({
      path,
      sessions: row.sessions,
      bounceRate: row.sessions ? row.bounces / row.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const topExitPages = Object.entries(merged.exitPages)
    .map(([path, sessions]) => ({ path, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const topSources = Object.entries(merged.bounceBySource)
    .map(([source, row]) => ({
      source,
      sessions: row.sessions,
      bounceRate: row.sessions ? row.bounces / row.sessions : 0,
      paid: isPaidTraffic({ utmMedium: source.includes("cpc") ? "cpc" : null }),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const utmCampaigns = Object.entries(merged.utmCampaigns)
    .map(([campaign, sessions]) => {
      const [source] = campaign.split(" · ");
      return { campaign, source: source || "unknown", sessions, bounceRate: 0 };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const revenue = revenueSummary(merged, merged.sessions);

  return {
    range: { from: args.from, to: args.to, preset: args.preset ?? "7d" },
    comparison: args.comparison ?? { from: args.from, to: args.to },
    storeId: args.storeId,
    includeExcluded: Boolean(args.includeExcluded),
    summary: {
      uniqueVisitors: metricDelta(merged.uniqueVisitors, previous.uniqueVisitors),
      sessions: metricDelta(merged.sessions, previous.sessions),
      bounceRate: metricDelta(merged.bounceRate, previous.bounceRate),
      newVisitors: metricDelta(merged.newVisitors, previous.newVisitors),
      returningVisitors: metricDelta(merged.returningVisitors, previous.returningVisitors),
      returningSessions: metricDelta(merged.returningSessions, previous.returningSessions),
      activeNow: args.activeNow ?? 0,
      avgSessionDurationMs: metricDelta(merged.avgSessionDurationMs, previous.avgSessionDurationMs),
      pagesPerSession: metricDelta(merged.pagesPerSession, previous.pagesPerSession),
      paidTrafficSessions: metricDelta(merged.paidTrafficSessions, previous.paidTrafficSessions),
    },
    funnel,
    bounceReasons: bounceReasons(merged),
    topLandingPages,
    topExitPages,
    topSources,
    utmCampaigns,
    devices: Object.entries(merged.devices)
      .map(([device, sessions]) => ({ device, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
    browsers: Object.entries(merged.browsers)
      .map(([browser, sessions]) => ({ browser, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
    countries: Object.entries(merged.countries)
      .map(([country, sessions]) => ({ country, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
    revenue,
    series: buildSeries({
      from: args.from,
      to: args.to,
      preset: args.preset ?? "7d",
      daily: args.daily,
      merged,
    }),
    daily: args.daily.map((row) => ({
      day: row.day,
      uniqueVisitors: row.metrics.uniqueVisitors,
      sessions: row.metrics.sessions,
      bounceRate: row.metrics.bounceRate,
    })),
  };
}

export function rollupForEmptyRange(
  from: string,
  to: string,
  storeId: string | "all",
  preset = "7d",
): AnalyticsDashboard {
  return buildDashboard({ storeId, from, to, preset, daily: [{ day: from, metrics: emptyRollup() }] });
}

export function comparisonRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const prevEnd = new Date(start.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  return {
    from: prevStart.toISOString().slice(0, 10),
    to: prevEnd.toISOString().slice(0, 10),
  };
}
