import { randomUUID } from "crypto";
import { getPrint, type PrintProductId } from "@/config/prints";
import type { Order, PrintOrder } from "@/lib/domain";
import { alertAdmin, sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { readBlob, signedBlobUrl } from "@/lib/blobs";
import { upscalePortraitForPrint } from "@/lib/fal/print-upscale";
import { productMeetsPortraitResolution } from "@/lib/pawtraitry-gallery-prints";
import { loadStoreConfig } from "@/lib/tenant/context";
import { mediaSigningBase, storeCanonicalOrigin } from "@/lib/tenant/origin";
import {
  normalizePhysicalBasket,
  pawtraitryBasketHasPhysical,
  type PawtraitryCheckoutBasket,
} from "@/lib/pawtraitry/create-basket";
import { safeRefundPortraitLineItem } from "@/lib/pawtraitry/partial-refund";
import { getStore } from "@/lib/store";
import { fulfillPrintToProdigi } from "@/lib/fulfillment";

export function existingBasketPrintUnits(prints: PrintOrder[], productId: PrintProductId) {
  return prints.filter(
    (row) =>
      row.productId === productId &&
      row.status !== "failed" &&
      row.status !== "pending_payment" &&
      (row.status === "submitted" || row.prodigiOrderId || row.status === "paid"),
  ).length;
}

function existingPrintUnits(prints: PrintOrder[], productId: PrintProductId) {
  return existingBasketPrintUnits(prints, productId);
}

async function pickBestPortraitAsset(orderId: string) {
  const store = getStore();
  const results = (await store.listAssets(orderId)).filter((a) => a.kind === "result");
  let best: (typeof results)[0] | null = null;
  let bestPixels = 0;
  for (const asset of results) {
    const file = await readBlob(asset.bucket, asset.storagePath);
    if (!file) continue;
    const { readPortraitDimensions } = await import("@/lib/print-compose/resolution");
    const dims = await readPortraitDimensions(file.bytes);
    const pixels = dims.width * dims.height;
    if (pixels > bestPixels) {
      bestPixels = pixels;
      best = asset;
    }
  }
  return best;
}

async function refundAllPhysicalLines(order: Order, basket: PawtraitryCheckoutBasket, reason: string) {
  for (const line of normalizePhysicalBasket(basket.physical)) {
    const product = getPrint(line.productId);
    const amount = product.pricePence * line.quantity;
    const units = existingPrintUnits(await getStore().listPrints(order.id), line.productId);
    if (units >= line.quantity) continue;
    await safeRefundPortraitLineItem(order, amount, reason);
  }
}

export async function fulfillPawtraitryCheckoutBasket(order: Order) {
  if (order.storeId !== "pawtraitry") return;
  const basket = order.productMeta?.checkoutBasket;
  if (!pawtraitryBasketHasPhysical(basket)) return;

  const store = getStore();
  const fresh = (await store.getOrder(order.id)) ?? order;
  const shipping = fresh.shipping;

  if (!shipping || shipping.countryCode !== "GB") {
    await alertAdmin(
      "Pawtraitry basket missing UK shipping",
      `<p>${fresh.email} paid for prints but we have no UK address.</p>`,
      fresh.storeId,
    );
    await refundAllPhysicalLines(
      fresh,
      basket!,
      "We could not post your prints without a UK delivery address, so we refunded those items.",
    );
    return;
  }

  const asset = await pickBestPortraitAsset(fresh.id);
  if (!asset) {
    await alertAdmin(
      "Pawtraitry basket: no portraits",
      `<p>${fresh.email} has paid print lines but no result assets.</p>`,
      fresh.storeId,
    );
    await refundAllPhysicalLines(
      fresh,
      basket!,
      "Your portraits were not ready for printing, so we refunded the physical items on your order.",
    );
    return;
  }

  const sourceFile = await readBlob(asset.bucket, asset.storagePath);
  if (!sourceFile) {
    await refundAllPhysicalLines(fresh, basket!, "We could not load your portrait file for printing.");
    return;
  }

  const config = await loadStoreConfig(fresh.storeId);
  const origin = storeCanonicalOrigin(fresh.storeId, config.brand, config.domains);
  const mediaBase = mediaSigningBase(origin);
  const imageUrl = await signedBlobUrl(asset.bucket, asset.storagePath, 60 * 60, false, mediaBase);

  let portraitBytes: Buffer;
  let portraitWidth: number;
  let portraitHeight: number;
  try {
    const upscaled = await upscalePortraitForPrint({
      orderId: fresh.id,
      sourceAssetId: asset.id,
      sourceBytes: sourceFile.bytes,
      imageUrl,
    });
    portraitBytes = upscaled.bytes;
    portraitWidth = upscaled.width;
    portraitHeight = upscaled.height;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upscale failed";
    await alertAdmin("Pawtraitry print upscale failed", `<p>${fresh.email}: ${message}</p>`, fresh.storeId);
    await refundAllPhysicalLines(
      fresh,
      basket!,
      "We could not upscale your portrait for print quality, so we refunded the physical items on your order.",
    );
    return;
  }

  const lines = normalizePhysicalBasket(basket!.physical);
  let printEmailSent = false;
  const existingPrints = await store.listPrints(fresh.id);

  for (const line of lines) {
    const product = getPrint(line.productId);
    const already = existingPrintUnits(existingPrints, line.productId);
    const remaining = line.quantity - already;
    if (remaining <= 0) continue;

    if (!productMeetsPortraitResolution(product, portraitWidth, portraitHeight)) {
      await safeRefundPortraitLineItem(
        fresh,
        product.pricePence * remaining,
        `${product.name} needs a larger portrait than we could prepare for print.`,
      );
      continue;
    }

    for (let copy = 0; copy < remaining; copy += 1) {
      const print: PrintOrder = {
        id: randomUUID(),
        orderId: fresh.id,
        productId: line.productId,
        assetId: asset.id,
        stripeCheckoutSessionId: fresh.stripeCheckoutSessionId,
        stripePaymentIntentId: fresh.stripePaymentIntentId,
        prodigiOrderId: null,
        status: "paid",
        shipping,
        error: null,
        createdAt: new Date().toISOString(),
      };
      await store.addPrint(print);
      existingPrints.push(print);
      try {
        await fulfillPrintToProdigi(print, fresh, shipping, portraitBytes);
        if (!printEmailSent) {
          printEmailSent = true;
          await sendEmail(
            withEmailDelivery(orderEmailDelivery(fresh), {
              to: fresh.email,
              subject: "Your Pawtraitry prints are with the printer",
              html: "<p>We have sent your physical items to our UK print partner using your best finished portrait from this order. Tracked delivery usually follows within a few days.</p>",
              storeId: fresh.storeId,
            }),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Prodigi failed";
        await store.updatePrint(print.id, { status: "failed", error: message });
        await safeRefundPortraitLineItem(fresh, product.pricePence, `${product.name}: ${message}`);
        await alertAdmin("Prodigi basket line failed", `<p>${fresh.email}: ${message}</p>`, fresh.storeId);
      }
    }
  }
}

export function checkoutBasketFromOrder(order: Order): PawtraitryCheckoutBasket | null {
  return order.productMeta?.checkoutBasket ?? null;
}
