export type ConsentLevel = "aggregate" | "analytics";

export type VisitorCollectPayload = {
  sessionId?: string;
  visitorId?: string;
  consent: ConsentLevel;
  path: string;
  referrer?: string;
  utm?: Record<string, string>;
  deviceType?: string;
  scrollDepth?: number;
  durationMs?: number;
  rageClick?: boolean;
  jsError?: string;
  slowLoadMs?: number;
  userAgent?: string;
  clickIds?: {
    gclid?: string;
    fbclid?: string;
    ttclid?: string;
  };
  event?: {
    type: string;
    metadata?: Record<string, unknown>;
  };
  leave?: boolean;
};

export type AnalyticsCollectContext = {
  countryCode?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  internalCheckHeader?: string | null;
  excludeCookie?: boolean;
  isAdmin?: boolean;
};

export type FunnelStep =
  | "landing"
  | "photo_upload"
  | "preview_generated"
  | "checkout_started"
  | "paid"
  | "upsell_add";

export type DailyRollupMetrics = {
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  newVisitors: number;
  returningVisitors: number;
  returningSessions: number;
  excludedSessions: number;
  pageviews: number;
  avgSessionDurationMs: number;
  pagesPerSession: number;
  paidTrafficSessions: number;
  funnel: Record<FunnelStep, number>;
  bounceByLanding: Record<string, { sessions: number; bounces: number }>;
  bounceBySource: Record<string, { sessions: number; bounces: number }>;
  bounceByDevice: Record<string, { sessions: number; bounces: number }>;
  exitPages: Record<string, number>;
  referrers: Record<string, number>;
  utmSources: Record<string, number>;
  utmCampaigns: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  countries: Record<string, number>;
  hourly: Record<string, number>;
  revenueBySource: Record<string, { orders: number; revenuePence: number }>;
  signals: {
    rageClicks: number;
    jsErrors: number;
    slowLoads: number;
    previewFailures: number;
    checkoutExpired: number;
  };
};

export type VisitorSessionRow = {
  id: string;
  storeId: string;
  visitorId: string;
  consentLevel: ConsentLevel;
  isNewVisitor: boolean;
  referrer: string | null;
  referrerDomain: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  landingPath: string;
  exitPath: string | null;
  deviceType: string | null;
  browser: string | null;
  countryCode: string | null;
  startedAt: string;
  endedAt: string | null;
  pageviewCount: number;
  bounced: boolean;
  hadInteraction: boolean;
  durationMs: number;
  maxScrollDepth: number;
  rageClicks: number;
  jsErrors: number;
  slowLoads: number;
  excludedFromMetrics: boolean;
  exclusionReason: string | null;
};

export type VisitorEventRow = {
  id: string;
  storeId: string;
  sessionId: string | null;
  visitorId: string | null;
  eventType: string;
  path: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RollupRow = {
  storeId: string;
  day: string;
  metrics: DailyRollupMetrics;
};

export type MetricDelta = { value: number; previous: number; delta: number | null };

export type AnalyticsDashboard = {
  range: { from: string; to: string; preset: string };
  comparison: { from: string; to: string };
  storeId: string | "all";
  includeExcluded: boolean;
  summary: {
    uniqueVisitors: MetricDelta;
    sessions: MetricDelta;
    bounceRate: MetricDelta;
    newVisitors: MetricDelta;
    returningVisitors: MetricDelta;
    returningSessions: MetricDelta;
    activeNow: number;
    avgSessionDurationMs: MetricDelta;
    pagesPerSession: MetricDelta;
    paidTrafficSessions: MetricDelta;
  };
  funnel: {
    step: FunnelStep;
    label: string;
    count: number;
    conversionFromPrevious: number | null;
    conversionFromLanding: number | null;
    dropOff: number;
    dropOffRate: number | null;
  }[];
  bounceReasons: { step: string; reason: string; count: number; detail: string }[];
  topLandingPages: { path: string; sessions: number; bounceRate: number }[];
  topExitPages: { path: string; sessions: number }[];
  topSources: { source: string; sessions: number; bounceRate: number; paid: boolean }[];
  utmCampaigns: { campaign: string; source: string; sessions: number; bounceRate: number }[];
  devices: { device: string; sessions: number }[];
  browsers: { browser: string; sessions: number }[];
  countries: { country: string; sessions: number }[];
  revenue: {
    orders: number;
    revenuePence: number;
    aovPence: number;
    conversionRate: number | null;
    bySource: { source: string; orders: number; revenuePence: number; aovPence: number; conversionRate: number | null }[];
  };
  series: { bucket: string; uniqueVisitors: number; sessions: number }[];
  daily: { day: string; uniqueVisitors: number; sessions: number; bounceRate: number }[];
  byStore?: Record<string, AnalyticsDashboard>;
};
