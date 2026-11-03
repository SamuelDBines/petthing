export const BISHOP_CO_FOOTER_LINE =
  "Bishop Co Tech Limited · Company no. 16240322 · 14 Riverside Walk, Ashford TN23 4AR";

export const EMAIL_STORE_IDS = ["pawtraitry", "fixmonger", "jinglefold"] as const;
export type EmailStoreId = (typeof EMAIL_STORE_IDS)[number];

export type BrandedEmailKind =
  | "order_confirmation"
  | "portrait_ready"
  | "shipped"
  | "delivered_review"
  | "welcome"
  | "abandoned_checkout";

export const MARKETING_EMAIL_KINDS: BrandedEmailKind[] = ["welcome", "abandoned_checkout"];

/** Fixmonger has no personalised portrait flow. */
export function brandedEmailMatrix(): { storeId: EmailStoreId; kind: BrandedEmailKind }[] {
  const out: { storeId: EmailStoreId; kind: BrandedEmailKind }[] = [];
  for (const storeId of EMAIL_STORE_IDS) {
    for (const kind of [
      "order_confirmation",
      "portrait_ready",
      "shipped",
      "delivered_review",
      "welcome",
      "abandoned_checkout",
    ] as BrandedEmailKind[]) {
      if (kind === "portrait_ready" && storeId === "fixmonger") continue;
      out.push({ storeId, kind });
    }
  }
  return out;
}
