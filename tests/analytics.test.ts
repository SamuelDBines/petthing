import test from "node:test";
import assert from "node:assert/strict";
import { emptyRollup, mergeRollups, rollupDay } from "../lib/analytics/rollup";
import type { VisitorEventRow, VisitorSessionRow } from "../lib/analytics/types";

test("rollupDay computes bounce rate and funnel counts", () => {
  const sessions: VisitorSessionRow[] = [
    {
      id: "1",
      storeId: "pawtraitry",
      visitorId: "a",
      consentLevel: "aggregate",
      isNewVisitor: true,
      referrer: "tiktok",
      utmSource: "tiktok",
      utmMedium: null,
      utmCampaign: null,
      landingPath: "/",
      exitPath: "/",
      deviceType: "mobile",
      countryCode: "GB",
      startedAt: new Date().toISOString(),
      endedAt: null,
      pageviewCount: 1,
      bounced: true,
      durationMs: 2000,
      maxScrollDepth: 10,
      rageClicks: 1,
      jsErrors: 0,
      slowLoads: 0,
    },
  ];
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
  assert.equal(metrics.signals.rageClicks, 1);
});

test("mergeRollups sums sessions across stores", () => {
  const a = emptyRollup();
  a.sessions = 2;
  const b = emptyRollup();
  b.sessions = 3;
  const merged = mergeRollups([a, b]);
  assert.equal(merged.sessions, 5);
});
