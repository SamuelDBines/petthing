import { formatGbp } from "@/config/pricing";
import type { ShopOrder } from "@/lib/catalogue/types";
import { sendEmail } from "@/lib/email";
import { loadStoreConfig } from "@/lib/tenant/context";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

async function storeMailContext(storeId: string) {
  const config = await loadStoreConfig(storeId);
  const origin = storeCanonicalOrigin(storeId, config.brand, config.domains);
  return { config, origin };
}

function lineItemsHtml(order: ShopOrder) {
  return order.lines
    .map((line) => `<li>${line.name} × ${line.quantity} — ${formatGbp(line.unitPricePence * line.quantity)}</li>`)
    .join("");
}

export async function sendShopOrderConfirmationEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  const shipping =
    order.shippingPence === 0
      ? "Free UK delivery"
      : `UK delivery ${formatGbp(order.shippingPence)}`;
  const html = `
    <p>Thanks for your ${config.brand.appName} order.</p>
    <p>We've received your payment of <strong>${formatGbp(order.amountPence)}</strong> (${shipping}).</p>
    <ul>${lineItemsHtml(order)}</ul>
    <p>We'll email you again when your order has been dispatched.</p>
    <p>Questions? Reply to this email or contact <a href="mailto:${config.brand.supportEmail}">${config.brand.supportEmail}</a>.</p>
    <p><a href="${origin}">Back to ${config.brand.appName}</a></p>
  `;
  await sendEmail({
    to: order.email,
    subject: `Your ${config.brand.appName} order confirmation`,
    html,
  });
}

export async function sendShopOrderDispatchedEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  const tracking = order.trackingNumber
    ? `<p>Tracking: <strong>${order.trackingNumber}</strong></p>`
    : "<p>Your parcel is on its way — tracking will follow if your carrier provides it.</p>";
  const html = `
    <p>Good news — your ${config.brand.appName} order has been dispatched.</p>
    <ul>${lineItemsHtml(order)}</ul>
    ${tracking}
    <p>Questions? <a href="mailto:${config.brand.supportEmail}">${config.brand.supportEmail}</a></p>
    <p><a href="${origin}">${config.brand.appName}</a></p>
  `;
  await sendEmail({
    to: order.email,
    subject: `Your ${config.brand.appName} order is on its way`,
    html,
  });
}
