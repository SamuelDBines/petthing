export type SignupSource =
  | "newsletter"
  | "shop_checkout"
  | "portrait_order"
  | "jinglefold_preview"
  | "christmas_preorder"
  | "abandoned_checkout"
  | "marketing_cookie";

export type PersonStatus = "subscriber" | "customer" | "repeat_customer" | "abandoned_checkout" | "lead";

export type PersonOrderRef = {
  id: string;
  storeId: string;
  kind: "portrait" | "shop" | "preorder";
  status: string;
  amountPence: number;
  paidPence: number;
  createdAt: string;
};

export type PersonTimelineEvent = {
  at: string;
  type: string;
  detail: string;
  storeId: string;
};

export type PersonRow = {
  email: string;
  name: string | null;
  storeIds: string[];
  firstSeenAt: string;
  signupSources: SignupSource[];
  utmSource: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  unsubscribed: boolean;
  suppressed: boolean;
  orderCount: number;
  paidOrderCount: number;
  totalSpentPence: number;
  lastOrderAt: string | null;
  status: PersonStatus;
  excludedFromMetrics: boolean;
};

export type PersonDetail = PersonRow & {
  orders: PersonOrderRef[];
  timeline: PersonTimelineEvent[];
};

export type SignupSparkline = {
  today: number;
  last7d: number;
  last30d: number;
  series: { day: string; count: number }[];
};
