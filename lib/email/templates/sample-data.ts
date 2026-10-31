import { FIXMONGER_COPY } from "@/config/catalogue/fixmonger-copy";
import { recommendedPence } from "@/config/catalogue/pricing-seed";
import { JINGLEFOLD_DELIVERY, JINGLEFOLD_PERSONALISED_PRODUCTS } from "@/config/jinglefold";
import { DIGITAL_PACK_TIER } from "@/config/pricing";
import type { BrandedEmailPayload } from "@/lib/email/templates/render";
import type { BrandedEmailKind, EmailStoreId } from "@/lib/email/templates/constants";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

function sampleOrigin(storeId: EmailStoreId) {
  const config = BUILTIN_STORES.find((s) => s.id === storeId)!;
  return storeCanonicalOrigin(storeId, config.brand, config.domains);
}

function storeOrderSample(storeId: EmailStoreId): BrandedEmailPayload {
  const shared = {
    firstName: "Sam",
    carrier: "Royal Mail",
    trackingNumber: "AB123456789GB",
    trackingUrl: "https://www.royalmail.com/track-your-item",
    cartUrl: "/shop/cart",
    unsubscribeUrl: "/api/marketing/unsubscribe?token=demo",
  };

  if (storeId === "pawtraitry") {
    const unit = DIGITAL_PACK_TIER.pricePence;
    return {
      ...shared,
      orderRef: "PT-DEMO01",
      hasPhysicalItems: false,
      galleryUrl: "/results/sample-token",
      subtotalPence: unit,
      shippingPence: 0,
      totalPence: unit,
      lines: [
        {
          name: "Digital pack: 3 HD portraits",
          quantity: 1,
          unitPricePence: unit,
          imageUrl: "/logo.svg",
        },
      ],
    };
  }

  if (storeId === "fixmonger") {
    const sku = "HOM-76459";
    const unit = recommendedPence("Fixmonger", sku);
    return {
      ...shared,
      orderRef: "FM-DEMO01",
      hasPhysicalItems: true,
      subtotalPence: unit,
      shippingPence: 0,
      totalPence: unit,
      lines: [
        {
          name: FIXMONGER_COPY[sku].name,
          quantity: 1,
          unitPricePence: unit,
          imageUrl: "/stores/products/fixmonger/HOM-76459.webp",
        },
      ],
    };
  }

  const product = JINGLEFOLD_PERSONALISED_PRODUCTS[0];
  const unit = recommendedPence("Christmas store", product.pricingSku);
  const shippingPence = unit >= JINGLEFOLD_DELIVERY.freeDeliveryOverPence ? 0 : JINGLEFOLD_DELIVERY.standardDeliveryPence;
  return {
    ...shared,
    orderRef: "JF-DEMO01",
    hasPhysicalItems: true,
    subtotalPence: unit,
    shippingPence,
    totalPence: unit + shippingPence,
    lines: [
      {
        name: product.name,
        quantity: 1,
        unitPricePence: unit,
        imageUrl: "/stores/jinglefold/hero.jpg",
      },
    ],
  };
}

export function samplePayload(storeId: EmailStoreId, kind: BrandedEmailKind): BrandedEmailPayload {
  const base = storeOrderSample(storeId);
  if (kind === "portrait_ready") {
    return {
      ...base,
      galleryUrl: base.galleryUrl ?? "/results/sample-token",
    };
  }
  return base;
}

/** Exposed for tests — canonical email base URL for sample store. */
export function sampleEmailOrigin(storeId: EmailStoreId) {
  return sampleOrigin(storeId);
}
