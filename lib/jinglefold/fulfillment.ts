import {
  personalisedProductForPricingSku,
  printfulVariantForPricingSku,
  prodigiSkuForPricingSku,
} from "@/config/jinglefold-partners";
import type { Order, Shipping } from "@/lib/domain";
import { alertAdmin, sendEmail } from "@/lib/email";
import { signedBlobUrl } from "@/lib/blobs";
import { fetchProdigiOrder, submitMerchandiseOrder } from "@/lib/prodigi";
import { fetchPrintfulOrder, submitPrintfulOrder } from "@/lib/printful";
import { orderPublicUrls } from "@/lib/generation";
import { loadStoreConfig } from "@/lib/tenant/context";
import { withTransientRetries } from "@/lib/transientErrors";
import { getStore } from "@/lib/store";

export type PartnerFulfillment = {
  provider: "prodigi" | "printful";
  externalOrderId: string;
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  lastSyncedAt: string;
  error?: string | null;
};

const PRODIGI_PRINT_AREA = process.env.PRODIGI_JINGLEFOLD_PRINT_AREA?.trim() || "default";

export function isJinglefoldPersonalisedPhysical(order: Order) {
  return order.storeId === "jinglefold" && Boolean(order.productMeta?.personalised);
}

async function resultAssetUrl(order: Order) {
  const store = getStore();
  const assets = await store.listAssets(order.id);
  const result = assets.find((a) => a.kind === "result");
  if (!result) throw new Error("No finished artwork to print");
  const { mediaBase } = await orderPublicUrls(order);
  return signedBlobUrl(result.bucket, result.storagePath, 60 * 60 * 48, false, mediaBase);
}

export async function submitJinglefoldPhysicalOrder(order: Order) {
  if (!isJinglefoldPersonalisedPhysical(order)) return null;
  if (order.partnerFulfillment?.externalOrderId) return order.partnerFulfillment;
  const pricingSku = order.productMeta?.pricingSku;
  if (!pricingSku) throw new Error("Missing personalised product SKU");
  const product = personalisedProductForPricingSku(pricingSku);
  if (!product) throw new Error(`Unknown personalised SKU ${pricingSku}`);
  const shipping = order.shipping;
  if (!shipping) throw new Error("Shipping address missing — customer must complete Stripe checkout with UK address");

  const imageUrl = await resultAssetUrl(order);
  const now = new Date().toISOString();
  let partner: PartnerFulfillment;

  try {
    if (product.supplier === "printful") {
      const variantId = printfulVariantForPricingSku(pricingSku);
      const result = await withTransientRetries(() =>
        submitPrintfulOrder({
        variantId,
        shipping,
        imageUrl,
        externalId: order.id,
      }),
      );
      partner = {
        provider: "printful",
        externalOrderId: result.printfulOrderId,
        status: result.status,
        lastSyncedAt: now,
      };
    } else {
      const sku = prodigiSkuForPricingSku(pricingSku);
      const copies = pricingSku === "XMAS-PLAS-BAUB-3" ? 3 : 1;
      const result = await withTransientRetries(() =>
        submitMerchandiseOrder({
          sku,
          shipping,
          assetUrl: imageUrl,
          printArea: PRODIGI_PRINT_AREA,
          merchantReference: order.id,
          copies,
        }),
      );
      partner = {
        provider: "prodigi",
        externalOrderId: result.prodigiOrderId,
        status: "InProgress",
        lastSyncedAt: now,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Partner submission failed";
    partner = {
      provider: product.supplier === "printful" ? "printful" : "prodigi",
      externalOrderId: "",
      status: "failed",
      lastSyncedAt: now,
      error: message,
    };
    await getStore().updateOrder(order.id, { partnerFulfillment: partner });
    await alertAdmin("Jinglefold physical order failed", `<p>${order.email}: ${message}</p>`, order.storeId);
    throw error;
  }

  await getStore().updateOrder(order.id, { partnerFulfillment: partner });
  const config = await loadStoreConfig(order.storeId);
  await sendEmail({
    to: order.email,
    subject: `Your ${config.brand.appName} gift is with our print partner`,
    html: `<p>We have sent your order to our UK print partner. You will receive tracking when it ships. Your preview gallery remains available from your confirmation email.</p>`,
  });
  return partner;
}

export async function syncPartnerFulfillment(order: Order): Promise<PartnerFulfillment | null> {
  const pf = order.partnerFulfillment;
  if (!pf?.externalOrderId) return null;
  const now = new Date().toISOString();
  try {
    const remote =
      pf.provider === "printful"
        ? await fetchPrintfulOrder(pf.externalOrderId)
        : await fetchProdigiOrder(pf.externalOrderId);
    const next: PartnerFulfillment = {
      ...pf,
      status: remote.status,
      trackingNumber: remote.trackingNumber,
      trackingUrl: remote.trackingUrl,
      lastSyncedAt: now,
      error: null,
    };
    const trackingChanged = remote.trackingNumber && remote.trackingNumber !== pf.trackingNumber;
    await getStore().updateOrder(order.id, { partnerFulfillment: next });
    if (trackingChanged && remote.trackingNumber) {
      const config = await loadStoreConfig(order.storeId);
      await sendEmail({
        to: order.email,
        subject: `Your ${config.brand.appName} order is on its way`,
        html: `<p>Tracking: <strong>${remote.trackingNumber}</strong>${remote.trackingUrl ? ` — <a href="${remote.trackingUrl}">Track parcel</a>` : ""}</p>`,
      });
    }
    return next;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    const next = { ...pf, lastSyncedAt: now, error: message };
    await getStore().updateOrder(order.id, { partnerFulfillment: next });
    return next;
  }
}

export async function syncAllOpenPartnerOrders(storeId = "jinglefold") {
  const store = getStore();
  const orders = await store.listOrders(storeId);
  let synced = 0;
  for (const order of orders) {
    if (!order.partnerFulfillment?.externalOrderId) continue;
    if (order.status === "refunded") continue;
    await syncPartnerFulfillment(order);
    synced += 1;
  }
  return synced;
}
