import { FIXMONGER_COPY } from "@/config/catalogue/fixmonger-copy";
import { recommendedPence } from "@/config/catalogue/pricing-seed";
import { JINGLEFOLD_DELIVERY, JINGLEFOLD_PERSONALISED_PRODUCTS } from "@/config/jinglefold";
import { TIERS } from "@/config/pricing";
import type { BrandedEmailPayload } from "@/lib/email/templates/render";
import type { BrandedEmailKind, EmailStoreId } from "@/lib/email/templates/constants";

const STORE_ORIGIN: Record<EmailStoreId, string> = {
  pawtraitry: "https://pawtraitry.com",
  fixmonger: "https://fixmonger.co.uk",
  jinglefold: "https://jinglefold.co.uk",
};

function storeOrderSample(storeId: EmailStoreId): BrandedEmailPayload {
  const origin = STORE_ORIGIN[storeId];
  const shared = {
    firstName: "Sam",
    carrier: "Royal Mail",
    trackingNumber: "AB123456789GB",
    trackingUrl: "https://www.royalmail.com/track-your-item",
    cartUrl: `${origin}/shop/cart`,
    unsubscribeUrl: `${origin}/api/marketing/unsubscribe?token=demo`,
  };

  if (storeId === "pawtraitry") {
    const tier = TIERS.find((t) => t.id === "classic") ?? TIERS[1];
    const unit = tier.pricePence;
    return {
      ...shared,
      orderRef: "PT-DEMO01",
      hasPhysicalItems: false,
      galleryUrl: `${origin}/results/sample-token`,
      subtotalPence: unit,
      shippingPence: 0,
      totalPence: unit,
      lines: [
        {
          name: `${tier.name} digital portrait`,
          quantity: 1,
          unitPricePence: unit,
          imageUrl: `${origin}/logo.svg`,
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
          imageUrl: `${origin}/stores/products/fixmonger/HOM-76459.webp`,
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
        imageUrl: `${origin}/stores/jinglefold/hero.jpg`,
      },
    ],
  };
}

export function samplePayload(storeId: EmailStoreId, kind: BrandedEmailKind): BrandedEmailPayload {
  const base = storeOrderSample(storeId);
  if (kind === "portrait_ready") {
    return {
      ...base,
      galleryUrl: base.galleryUrl ?? `${STORE_ORIGIN[storeId]}/results/sample-token`,
    };
  }
  return base;
}
