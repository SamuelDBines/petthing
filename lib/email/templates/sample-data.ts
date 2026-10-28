import type { BrandedEmailPayload } from "@/lib/email/templates/render";
import type { BrandedEmailKind, EmailStoreId } from "@/lib/email/templates/constants";

export function samplePayload(storeId: EmailStoreId, kind: BrandedEmailKind): BrandedEmailPayload {
  const base: BrandedEmailPayload = {
    firstName: "Sam",
    orderRef: "FM-DEMO01",
    subtotalPence: 4998,
    shippingPence: 0,
    totalPence: 4998,
    carrier: "Royal Mail",
    trackingNumber: "AB123456789GB",
    trackingUrl: "https://www.royalmail.com/track-your-item",
    galleryUrl: "https://example.com/results/sample-token",
    cartUrl: "https://example.com/shop/cart",
    unsubscribeUrl: "https://example.com/api/marketing/unsubscribe?token=demo",
    lines: [
      {
        name:
          storeId === "fixmonger"
            ? "Magnetic thermal door curtain 90×210 cm"
            : storeId === "jinglefold"
              ? "Personalised pet bauble"
              : "Digital portrait — Victorian style",
        quantity: 1,
        unitPricePence: storeId === "pawtraitry" ? 999 : 2599,
        imageUrl: "https://pawtraitry.com/stores/fixmonger/hero.jpg",
      },
    ],
  };
  if (kind === "portrait_ready") {
    return { ...base, firstName: "Sam", galleryUrl: base.galleryUrl };
  }
  return base;
}
