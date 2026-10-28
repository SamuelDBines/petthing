export type CheckoutSuccessKind = "portrait" | "print" | "christmas" | "unknown";

export type CheckoutSuccessPhase =
  | "confirming"
  | "generating"
  | "ready"
  | "review"
  | "failed"
  | "refunded"
  | "expired_unpaid"
  | "christmas_booked"
  | "print_processing";

export type CheckoutSuccessProgress = {
  expected: number;
  generated: number;
};

export type CheckoutSuccessPayload = {
  kind: CheckoutSuccessKind;
  phase: CheckoutSuccessPhase;
  orderRef: string | null;
  email: string | null;
  packageName: string | null;
  styleNames: string[];
  imageCount: number | null;
  uploadThumbnailUrl: string | null;
  amountPence: number | null;
  orderedAt: string | null;
  resultsPath: string | null;
  progress: CheckoutSuccessProgress | null;
  failureReason: string | null;
  trackPurchase: boolean;
};
