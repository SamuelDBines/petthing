import type { AnalyticsDashboard, DailyRollupMetrics, FunnelStep } from "@/lib/analytics/types";
import { emptyRollup, mergeRollups } from "@/lib/analytics/rollup";

const FUNNEL_ORDER: FunnelStep[] = ["landing", "photo_upload", "preview_generated", "checkout_started", "paid", "upsell_add"];

function bounceReasons(metrics: DailyRollupMetrics) {
  const reasons: { reason: string; count: number; detail: string }[] = [];
  const topLanding = Object.entries(metrics.bounceByLanding)
    .map(([path, row]) => ({ path, rate: row.sessions ? row.bounces / row.sessions : 0, sessions: row.sessions }))
    .sort((a, b) => b.rate - a.rate)[0];
  if (topLanding && topLanding.rate > 0.4) {
    reasons.push({
      reason: "High bounce on landing page",
      count: Math.round(topLanding.rate * topLanding.sessions),
      detail: topLanding.path,
    });
  }
  if (metrics.signals.slowLoads > 0) {
    reasons.push({ reason: "Slow page loads", count: metrics.signals.slowLoads, detail: "LCP / load > 4s" });
  }
  if (metrics.signals.rageClicks > 0) {
    reasons.push({ reason: "Rage clicks", count: metrics.signals.rageClicks, detail: "Repeated clicks without navigation" });
  }
  if (metrics.signals.jsErrors > 0) {
    reasons.push({ reason: "JavaScript errors", count: metrics.signals.jsErrors, detail: "Client exceptions during visit" });
  }
  if (metrics.signals.previewFailures > 0) {
    reasons.push({ reason: "Preview generation failed", count: metrics.signals.previewFailures, detail: "Create flow errors" });
  }
  if (metrics.signals.checkoutExpired > 0) {
    reasons.push({ reason: "Checkout abandoned / expired", count: metrics.signals.checkoutExpired, detail: "Stripe session expired" });
  }
  const dropUpload =
    metrics.funnel.landing > 0 ? 1 - metrics.funnel.photo_upload / metrics.funnel.landing : 0;
  if (dropUpload > 0.35 && metrics.funnel.landing >= 5) {
    reasons.push({
      reason: "Drop-off before photo upload",
      count: Math.round(metrics.funnel.landing - metrics.funnel.photo_upload),
      detail: `${Math.round(dropUpload * 100)}% leave before uploading`,
    });
  }
  return reasons.sort((a, b) => b.count - a.count).slice(0, 6);
}

export function buildDashboard(args: {
  storeId: string | "all";
  from: string;
  to: string;
  daily: { day: string; metrics: DailyRollupMetrics }[];
}): AnalyticsDashboard {
  const merged = mergeRollups(args.daily.map((row) => row.metrics));
  let previous = merged.funnel.landing || 0;
  const funnel = FUNNEL_ORDER.map((step) => {
    const count = merged.funnel[step];
    const conversionFromPrevious = previous > 0 ? count / previous : null;
    previous = count || previous;
    return { step, count, conversionFromPrevious };
  });

  const topLandingPages = Object.entries(merged.bounceByLanding)
    .map(([path, row]) => ({
      path,
      sessions: row.sessions,
      bounceRate: row.sessions ? row.bounces / row.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const topSources = Object.entries(merged.bounceBySource)
    .map(([source, row]) => ({
      source,
      sessions: row.sessions,
      bounceRate: row.sessions ? row.bounces / row.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  return {
    range: { from: args.from, to: args.to },
    storeId: args.storeId,
    summary: {
      uniqueVisitors: merged.uniqueVisitors,
      sessions: merged.sessions,
      bounceRate: merged.bounceRate,
      newVisitors: merged.newVisitors,
      returningVisitors: merged.returningVisitors,
    },
    funnel,
    bounceReasons: bounceReasons(merged),
    topLandingPages,
    topSources,
    daily: args.daily.map((row) => ({
      day: row.day,
      uniqueVisitors: row.metrics.uniqueVisitors,
      sessions: row.metrics.sessions,
      bounceRate: row.metrics.bounceRate,
    })),
  };
}

export function rollupForEmptyRange(from: string, to: string, storeId: string | "all"): AnalyticsDashboard {
  return buildDashboard({ storeId, from, to, daily: [{ day: from, metrics: emptyRollup() }] });
}
