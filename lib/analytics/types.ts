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
  event?: {
    type: string;
    metadata?: Record<string, unknown>;
  };
  leave?: boolean;
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
  pageviews: number;
  funnel: Record<FunnelStep, number>;
  bounceByLanding: Record<string, { sessions: number; bounces: number }>;
  bounceBySource: Record<string, { sessions: number; bounces: number }>;
  bounceByDevice: Record<string, { sessions: number; bounces: number }>;
  exitPages: Record<string, number>;
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
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string;
  exitPath: string | null;
  deviceType: string | null;
  countryCode: string | null;
  startedAt: string;
  endedAt: string | null;
  pageviewCount: number;
  bounced: boolean;
  durationMs: number;
  maxScrollDepth: number;
  rageClicks: number;
  jsErrors: number;
  slowLoads: number;
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

export type AnalyticsDashboard = {
  range: { from: string; to: string };
  storeId: string | "all";
  summary: {
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    newVisitors: number;
    returningVisitors: number;
  };
  funnel: { step: FunnelStep; count: number; conversionFromPrevious: number | null }[];
  bounceReasons: { reason: string; count: number; detail: string }[];
  topLandingPages: { path: string; sessions: number; bounceRate: number }[];
  topSources: { source: string; sessions: number; bounceRate: number }[];
  daily: { day: string; uniqueVisitors: number; sessions: number; bounceRate: number }[];
};
