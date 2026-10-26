import { boolean, date, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DailyRollupMetrics } from "@/lib/analytics/types";
import type { Order, PrintOrder, Settings } from "@/lib/domain";
import type { StoreConfig } from "@/lib/tenant/types";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const stores = pgTable("stores", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  domains: text("domains").array().notNull().default([]),
  config: jsonb("config").$type<Partial<StoreConfig>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").notNull().default("pawtraitry"),
  createdAt: ts("created_at").notNull(),
  email: text("email").notNull(),
  themeId: text("theme_id").notNull(),
  subjectType: text("subject_type").notNull(),
  tierId: text("tier_id").notNull(),
  styleIds: text("style_ids").array().notNull(),
  cardNames: text("card_names").notNull().default(""),
  status: text("status").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPence: integer("amount_pence").notNull(),
  priority: boolean("priority").notNull().default(false),
  consentAt: ts("consent_at"),
  digitalSupplyConsentAt: ts("digital_supply_consent_at"),
  utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
  referralCodeUsed: text("referral_code_used"),
  ownReferralCode: text("own_referral_code").notNull(),
  resultsToken: text("results_token").notNull().unique(),
  uploadToken: text("upload_token").notNull(),
  generationCostGbp: numeric("generation_cost_gbp", { precision: 12, scale: 4, mode: "number" }).notNull().default(0),
  deliveredAt: ts("delivered_at"),
  photosDeleteAfter: ts("photos_delete_after"),
  resultsDeleteAfter: ts("results_delete_after"),
  ipHash: text("ip_hash").notNull().default(""),
  uploadsDeletedAt: ts("uploads_deleted_at"),
  resultsDeletedAt: ts("results_deleted_at"),
  failureReason: text("failure_reason"),
  processedSessions: text("processed_sessions").array().notNull().default([]),
  referralRewardGranted: boolean("referral_reward_granted").notNull().default(false),
  pendingBonusEmail: boolean("pending_bonus_email").notNull().default(false),
  offer: text("offer").notNull().default("one_off"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  payments: jsonb("payments").$type<Order["payments"]>().notNull().default([]),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  kind: text("kind").notNull(),
  styleId: text("style_id"),
  variantIndex: integer("variant_index"),
  storagePath: text("storage_path").notNull(),
  bucket: text("bucket").notNull(),
  contentType: text("content_type").notNull(),
  moderation: text("moderation").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  styleId: text("style_id").notNull(),
  variantIndex: integer("variant_index").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(0),
  providerRequestId: text("provider_request_id"),
  lastError: text("last_error"),
  costGbp: numeric("cost_gbp", { precision: 12, scale: 4, mode: "number" }).notNull().default(0),
  priority: boolean("priority").notNull().default(false),
  lockedUntil: ts("locked_until"),
  nextRunAt: ts("next_run_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").notNull().default("pawtraitry"),
  type: text("type").notNull(),
  orderId: uuid("order_id"),
  createdAt: ts("created_at").notNull(),
});

export const prints = pgTable("prints", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: text("product_id").notNull(),
  assetId: uuid("asset_id").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  prodigiOrderId: text("prodigi_order_id"),
  status: text("status").notNull(),
  shipping: jsonb("shipping").$type<PrintOrder["shipping"]>(),
  error: text("error"),
  createdAt: ts("created_at").notNull(),
});

export const preorders = pgTable("preorders", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").notNull().default("pawtraitry"),
  orderId: uuid("order_id"),
  email: text("email").notNull(),
  themeId: text("theme_id").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPence: integer("amount_pence").notNull(),
  status: text("status").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const appSettings = pgTable("app_settings", {
  storeId: text("store_id").primaryKey(),
  themeMode: text("theme_mode").$type<Settings["themeMode"]>().notNull().default("auto"),
  activeThemeId: text("active_theme_id").notNull().default("halloween"),
  salesPaused: boolean("sales_paused").notNull().default(false),
  queueHalted: boolean("queue_halted").notNull().default(false),
  haltReason: text("halt_reason"),
  haltNotifiedOn: text("halt_notified_on"),
});

export const rateBuckets = pgTable("rate_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: ts("reset_at").notNull(),
});

export const dailySpend = pgTable(
  "daily_spend",
  {
    storeId: text("store_id").notNull().default("pawtraitry"),
    day: text("day").notNull(),
    gbp: numeric("gbp", { precision: 12, scale: 4, mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.storeId, table.day] })],
);

export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  consentLevel: text("consent_level").notNull().default("aggregate"),
  isNewVisitor: boolean("is_new_visitor").notNull().default(true),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  landingPath: text("landing_path").notNull(),
  exitPath: text("exit_path"),
  deviceType: text("device_type"),
  countryCode: text("country_code"),
  startedAt: ts("started_at").notNull(),
  endedAt: ts("ended_at"),
  pageviewCount: integer("pageview_count").notNull().default(1),
  bounced: boolean("bounced").notNull().default(false),
  durationMs: integer("duration_ms").notNull().default(0),
  maxScrollDepth: integer("max_scroll_depth").notNull().default(0),
  rageClicks: integer("rage_clicks").notNull().default(0),
  jsErrors: integer("js_errors").notNull().default(0),
  slowLoads: integer("slow_loads").notNull().default(0),
});

export const visitorEvents = pgTable("visitor_events", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").notNull(),
  sessionId: uuid("session_id"),
  visitorId: text("visitor_id"),
  eventType: text("event_type").notNull(),
  path: text("path"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const analyticsDailyRollups = pgTable(
  "analytics_daily_rollups",
  {
    storeId: text("store_id").notNull(),
    day: date("day").notNull(),
    metrics: jsonb("metrics").$type<DailyRollupMetrics>().notNull().default({} as DailyRollupMetrics),
  },
  (table) => [primaryKey({ columns: [table.storeId, table.day] })],
);
