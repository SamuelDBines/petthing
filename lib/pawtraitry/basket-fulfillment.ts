import { randomUUID } from "crypto";
import { getPrint } from "@/config/prints";
import type { Asset, Order, PrintOrder, Shipping } from "@/lib/domain";
import { alertAdmin, sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { readPortraitDimensions } from "@/lib/print-compose/resolution";
import { productMeetsPortraitResolution } from "@/lib/pawtraitry-gallery-prints";
import {
  normalizePhysicalBasket,
  pawtraitryBasketHasPhysical,
  type PawtraitryCheckoutBasket,
} from "@/lib/pawtraitry/create-basket";
import { refundPortraitLineItem } from "@/lib/pawtraitry/partial-refund";
import { readBlob } from "@/lib/blobs";
import { getStore } from "@/lib/store";
import { fulfillPrintToProdigi } from "@/lib/fulfillment";

async function pickBestPortraitAsset(orderId: string): Promise<Asset | null> {
  const store = getStore();
  const results = (await store.listAssets(orderId)).filter((a) => a.kind === "result");
  let best: Asset | null = null;
  let bestPixels = 0;
  for (const asset of results) {
    const file = await readBlob(asset.bucket, asset.storagePath);
    if (!file) continue;
    const dims = await readPortraitDimensions(file.bytes);
    const pixels = dims.width * dims.height;
    if (pixels > bestPixels) {
      bestPixels = pixels;
      best = asset;
    }
  }
  return best;
}

export async function fulfillPawtraitryCheckoutBasket(order: Order) {
  if (order.storeId !== "pawtraitry") return;
  const basket = order.productMeta?.checkoutBasket;
  if (!pawtraitryBasketHasPhysical(basket)) return;
  const shipping = order.shipping;
  if (!shipping || shipping.countryCode !== "GB") {
    await alertAdmin(
      "Pawtraitry basket missing UK shipping",
      `<p>${order.email} paid for prints but we have no UK address.</p>`,
      order.storeId,
    );
    return;
  }
  const asset = await pickBestPortraitAsset(order.id);
  if (!asset) {
    await alertAdmin("Pawtraitry basket: no portraits", `<p>${order.email} has paid print lines but no result assets.</p>`, order.storeId);
    return;
  }
  const file = await readBlob(asset.bucket, asset.storagePath);
  if (!file) return;
  const dims = await readPortraitDimensions(file.bytes);
  const store = getStore();
  const lines = normalizePhysicalBasket(basket!.physical);
  let printEmailSent = false;

  for (const line of lines) {
    const product = getPrint(line.productId);
    if (!productMeetsPortraitResolution(product, dims.width, dims.height)) {
      const refundPence = product.pricePence * line.quantity;
      await refundPortraitLineItem(order, refundPence, `${product.name} could not be printed at full quality from your portraits.`);
      continue;
    }
    for (let copy = 0; copy < line.quantity; copy += 1) {
      const print: PrintOrder = {
        id: randomUUID(),
        orderId: order.id,
        productId: line.productId,
        assetId: asset.id,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId,
        stripePaymentIntentId: order.stripePaymentIntentId,
        prodigiOrderId: null,
        status: "paid",
        shipping,
        error: null,
        createdAt: new Date().toISOString(),
      };
      await store.addPrint(print);
      try {
        await fulfillPrintToProdigi(print, order, shipping);
        if (!printEmailSent) {
          printEmailSent = true;
          await sendEmail(
            withEmailDelivery(orderEmailDelivery(order), {
              to: order.email,
              subject: "Your Pawtraitry prints are with the printer",
              html: "<p>We have sent your physical items to our UK print partner using your best portrait from this order. Tracked delivery usually follows within a few days.</p>",
              storeId: order.storeId,
            }),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Prodigi failed";
        await store.updatePrint(print.id, { status: "failed", error: message });
        await refundPortraitLineItem(order, product.pricePence, `${product.name}: ${message}`);
        await alertAdmin("Prodigi basket line failed", `<p>${order.email}: ${message}</p>`, order.storeId);
      }
    }
  }
}

export function checkoutBasketFromOrder(order: Order): PawtraitryCheckoutBasket | null {
  return order.productMeta?.checkoutBasket ?? null;
}
