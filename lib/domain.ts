import type { PrintProductId } from "@/config/prints";
import type { TierId } from "@/config/pricing";
import type { SubjectType } from "@/config/themes";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "generating"
  | "review"
  | "delivered"
  | "failed"
  | "refunded";

export type Order = {
  id: string;
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
  amountPence: number;
  priority: boolean;
  consentAt: string;
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
};

export type Asset = {
  id: string;
  orderId: string;
  kind: "upload" | "result" | "preview";
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
};

export type Bucket = "uploads" | "results";

export type Database = {
  orders: Order[];
  assets: Asset[];
  jobs: Job[];
  events: AnalyticsEvent[];
  prints: PrintOrder[];
  preorders: Preorder[];
  settings: Settings;
  rateLimits: { key: string; count: number; resetAt: string }[];
  spend: { day: string; gbp: number }[];
};
