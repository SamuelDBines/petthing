import { friendlyOrderRef } from "@/lib/checkout/success-view";
import type { Order } from "@/lib/domain";
import { renderBrandedEmail } from "@/lib/email/templates/render";
import { sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { getPrint } from "@/config/prints";
import { getTier } from "@/config/pricing";
import { loadStoreConfig } from "@/lib/tenant/context";
import {
  normalizePhysicalBasket,
  pawtraitryBasketHasPhysical,
  pawtraitryBasketShippingPence,
  pawtraitryBasketSummary,
} from "@/lib/pawtraitry/create-basket";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

export async function sendPawtraitryOrderConfirmationEmail(order: Order) {
  if (order.storeId !== "pawtraitry" || order.offer === "season_pass") return;
  const config = await loadStoreConfig(order.storeId);
  const tier = getTier(order.tierId, config.catalog.tiers);
  const physical = order.productMeta?.checkoutBasket?.physical ?? [];
  const summary = pawtraitryBasketSummary({
    tier,
    tierId: order.tierId,
    offer: order.offer,
    seasonPassPence: 0,
    seasonPassName: "",
    priority: order.priority,
    referralDiscountPence: 0,
    physical,
  });
  const origin = storeCanonicalOrigin(order.storeId, config.brand, config.domains);
  const lines = summary.lines.map((row) => ({
    name: row.label,
    quantity: row.quantity ?? 1,
    unitPricePence: row.amountPence / (row.quantity ?? 1),
    imageUrl: undefined as string | undefined,
  }));
  for (const row of normalizePhysicalBasket(physical)) {
    const product = getPrint(row.productId);
    const idx = lines.findIndex((l) => l.name.includes(product.name));
    if (idx >= 0 && product.previewImage) lines[idx]!.imageUrl = product.previewImage;
  }
  const rendered = await renderBrandedEmail("pawtraitry", "order_confirmation", {
    orderRef: friendlyOrderRef(order.id),
    hasPhysicalItems: pawtraitryBasketHasPhysical(order.productMeta?.checkoutBasket),
    galleryUrl: `${origin}/results/${order.resultsToken}`,
    subtotalPence: summary.subtotalPence,
    shippingPence: pawtraitryBasketShippingPence(physical),
    totalPence: summary.totalPence,
    lines,
  });
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      storeId: order.storeId,
      fromRole: rendered.fromRole,
    }),
  );
}
