import type { CatalogueProduct, ShopOrder, SupplierBatchExport } from "@/lib/catalogue/types";
import type { RollupRow, VisitorEventRow, VisitorSessionRow } from "@/lib/analytics/types";
import type { SignupSource } from "@/lib/crm/types";
import type { HandPaintedOrderRow } from "@/lib/handPainted";
import type { PrintProductId } from "@/config/prints";
import type { TierId } from "@/config/pricing";
import type { SubjectType } from "@/config/themes";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "generating"
  | "waiting_for_credit"
  | "review"
  | "delivered"
  | "failed"
  | "refunded";

export type Order = {
  id: string;
  storeId: string;
  createdAt: string;
  email: string;
  themeId: string;
  subjectType: SubjectType;
  tierId: TierId;
  styleIds: string[];
  cardNames: string;
  status: OrderStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeLivemode?: boolean | null;
  amountPence: number;
  priority: boolean;
  consentAt: string;
  digitalSupplyConsentAt: string;
  utm: Record<string, string>;
  referralCodeUsed: string | null;
  ownReferralCode: string;
  resultsToken: string;
  uploadToken: string;
  generationCostGbp: number;
  deliveredAt: string | null;
  photosDeleteAfter: string | null;
  resultsDeleteAfter: string | null;
  ipHash: string;
  uploadsDeletedAt: string | null;
  resultsDeletedAt: string | null;
  failureReason: string | null;
  processedSessions: string[];
  referralRewardGranted: boolean;
  pendingBonusEmail: boolean;
  offer: "one_off" | "season_pass";
  stripeSubscriptionId: string | null;
  subscriptionStatus: "active" | "canceled" | null;
  payments: { sessionId: string; paymentIntentId: string | null; amountPence: number; kind: string; createdAt: string }[];
  productMeta?: {
    pricingSku?: string;
    personalised?: boolean;
    lateDeliveryAckAt?: string;
    /** Automated NSFW scan failed (fal outage) — manual photo review in admin. */
    photoSafetyReviewRequired?: boolean;
    checkoutBasket?: import("@/lib/pawtraitry/create-basket").PawtraitryCheckoutBasket;
  } | null;
  shipping?: Shipping | null;
  partnerFulfillment?: {
    provider: "prodigi" | "printful";
    externalOrderId: string;
    status: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    lastSyncedAt: string;
    error?: string | null;
  } | null;
  /** Paid fal queue submissions for this portrait order (cap enforced in generation). */
  falPaidSubmits?: number;
};

export type Asset = {
  id: string;
  orderId: string;
  kind: "upload" | "result" | "result_replacement" | "preview";
  styleId: string | null;
  variantIndex: number | null;
  storagePath: string;
  bucket: Bucket;
  contentType: string;
  moderation: "passed" | "skipped" | "rejected";
  createdAt: string;
};

export type JobStatus = "queued" | "submitted" | "running" | "done" | "failed" | "dead";

export type Job = {
  id: string;
  orderId: string;
  styleId: string;
  variantIndex: number;
  status: JobStatus;
  attempts: number;
  providerRequestId: string | null;
  providerMeta?: { statusUrl: string; responseUrl: string } | null;
  falPaidSubmits?: number;
  regenCount?: number;
  lastError: string | null;
  costGbp: number;
  priority: boolean;
  lockedUntil: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsEvent = {
  id: string;
  storeId: string;
  type: "create_start" | "checkout" | "paid";
  orderId: string | null;
  createdAt: string;
};

export type Shipping = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

export type PrintOrder = {
  id: string;
  orderId: string;
  productId: PrintProductId;
  assetId: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  prodigiOrderId: string | null;
  status: "pending_payment" | "paid" | "submitted" | "failed";
  shipping: Shipping | null;
  error: string | null;
  createdAt: string;
};

export type Preorder = {
  id: string;
  storeId: string;
  orderId: string | null;
  email: string;
  themeId: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  amountPence: number;
  status: "pending_payment" | "paid";
  createdAt: string;
};

export type Settings = {
  themeMode: "auto" | "manual";
  activeThemeId: string;
  salesPaused: boolean;
  queueHalted: boolean;
  haltReason: string | null;
  haltNotifiedOn: string | null;
  falCreditExhaustedSince: string | null;
  falCreditAlertSentAt: string | null;
};

export type Bucket = "uploads" | "results";

export type StoreSettingsRow = {
  storeId: string;
  settings: Settings;
  configPatch: Record<string, unknown>;
};

export type Database = {
  orders: Order[];
  assets: Asset[];
  jobs: Job[];
  events: AnalyticsEvent[];
  prints: PrintOrder[];
  preorders: Preorder[];
  shopOrders: ShopOrder[];
  supplierBatches: SupplierBatchExport[];
  handPaintedOrders: HandPaintedOrderRow[];
  settings: Settings;
  settingsByStore: Record<string, Settings>;
  storeConfigPatches: Record<string, Record<string, unknown>>;
  rateLimits: { key: string; count: number; resetAt: string }[];
  spend: { storeId: string; day: string; gbp: number }[];
  visitorSessions: VisitorSessionRow[];
  visitorEvents: VisitorEventRow[];
  analyticsRollups: RollupRow[];
  catalogueProducts: CatalogueProduct[];
  adminLoginEvents: { id: string; email: string; ip: string; createdAt: string }[];
  emailSignups: {
    id: string;
    storeId: string;
    email: string;
    source: SignupSource;
    name: string | null;
    marketingConsent: boolean;
    marketingConsentAt: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrer: string | null;
    excludedFromMetrics: boolean;
    unsubscribedAt: string | null;
    createdAt: string;
  }[];
};
