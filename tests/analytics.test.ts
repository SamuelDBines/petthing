import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard } from "../lib/analytics/dashboard";
import { computeFunnelConversions, countVisitorsByNewReturning, clampRate } from "../lib/analytics/metrics";
import { emptyRollup, mergeRollups, rollupDay } from "../lib/analytics/rollup";
import { classifyTraffic } from "../lib/analytics/traffic";
import type { VisitorEventRow, VisitorSessionRow } from "../lib/analytics/types";

function session(partial: Partial<VisitorSessionRow> & Pick<VisitorSessionRow, "id" | "visitorId">): VisitorSessionRow {
  return {
    storeId: "pawtraitry",
    consentLevel: "analytics",
    isNewVisitor: true,
    referrer: null,
    referrerDomain: "direct",
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    gclid: null,
    fbclid: null,
    ttclid: null,
    landingPath: "/",
    exitPath: "/",
    deviceType: "desktop",
    browser: "Chrome",
    countryCode: "GB",
    startedAt: "2026-10-28T10:00:00.000Z",
    endedAt: null,
    pageviewCount: 1,
    bounced: true,
    hadInteraction: false,
    durationMs: 2000,
    maxScrollDepth: 0,
    rageClicks: 0,
    jsErrors: 0,
    slowLoads: 0,
    excludedFromMetrics: false,
    exclusionReason: null,
    ...partial,
  };
}

test("countVisitorsByNewReturning counts visitors not sessions", () => {
  const counts = countVisitorsByNewReturning([
    session({ id: "1", visitorId: "a", isNewVisitor: true }),
    session({ id: "2", visitorId: "a", isNewVisitor: false }),
    session({ id: "3", visitorId: "b", isNewVisitor: false }),
  ]);
  assert.equal(counts.uniqueVisitors, 2);
  assert.equal(counts.newVisitors, 1);
  assert.equal(counts.returningVisitors, 1);
  assert.equal(counts.newVisitors + counts.returningVisitors, counts.uniqueVisitors);
  assert.equal(counts.returningSessions, 2);
});

test("computeFunnelConversions skips empty steps and caps at 100%", () => {
  const funnel = emptyRollup().funnel;
  funnel.landing = 100;
  funnel.photo_upload = 20;
  funnel.checkout_started = 25;
  const rows = computeFunnelConversions(funnel, [
    "landing",
    "photo_upload",
    "preview_generated",
    "checkout_started",
    "paid",
    "upsell_add",
  ]);
  const checkout = rows.find((row) => row.step === "checkout_started");
  assert.equal(checkout?.conversionFromPrevious, 1);
  assert.ok((checkout?.conversionFromLanding ?? 0) <= 1);
  for (const row of rows) {
    if (row.conversionFromPrevious != null) assert.ok(row.conversionFromPrevious <= 1);
    if (row.conversionFromLanding != null) assert.ok(row.conversionFromLanding <= 1);
  }
});

test("clampRate never returns NaN", () => {
  assert.equal(clampRate(1, 0), null);
  assert.equal(clampRate(0, 0), null);
});

test("rollupDay computes bounce rate and funnel counts", () => {
  const sessions: VisitorSessionRow[] = [session({ id: "1", visitorId: "a" })];
  const events: VisitorEventRow[] = [
    {
      id: "e1",
      storeId: "pawtraitry",
      sessionId: "1",
      visitorId: "a",
      eventType: "landing",
      path: "/",
      metadata: {},
      createdAt: new Date().toISOString(),
    },
    {
      id: "e2",
      storeId: "pawtraitry",
      sessionId: "1",
      visitorId: "a",
      eventType: "photo_upload",
      path: "/create",
      metadata: {},
      createdAt: new Date().toISOString(),
    },
  ];
  const metrics = rollupDay(sessions, events);
  assert.equal(metrics.sessions, 1);
  assert.equal(metrics.bounceRate, 1);
  assert.equal(metrics.funnel.photo_upload, 1);
});

test("buildDashboard new and returning sum to unique visitors", () => {
  const metrics = emptyRollup();
  metrics.uniqueVisitors = 10;
  metrics.newVisitors = 4;
  metrics.returningVisitors = 6;
  metrics.sessions = 25;
  const dash = buildDashboard({
    storeId: "pawtraitry",
    from: "2026-10-28",
    to: "2026-10-28",
    daily: [{ day: "2026-10-28", metrics }],
  });
  assert.equal(
    dash.summary.newVisitors.value + dash.summary.returningVisitors.value,
    dash.summary.uniqueVisitors.value,
  );
});

test("classifyTraffic flags bots and headless browsers", () => {
  assert.equal(classifyTraffic({ userAgent: "Googlebot/2.1" }).excluded, true);
  assert.equal(classifyTraffic({ userAgent: "HeadlessChrome/120" }).excluded, true);
  assert.equal(classifyTraffic({ userAgent: "Mozilla/5.0 Chrome/120" }).excluded, false);
});

test("mergeRollups sums sessions across stores", () => {
  const a = emptyRollup();
  a.sessions = 2;
  const b = emptyRollup();
  b.sessions = 3;
  const merged = mergeRollups([a, b]);
  assert.equal(merged.sessions, 5);
});
