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

export async function sendShopOrderSubmittedToSupplierEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  const html = `
    <p>Thanks again — we've passed your ${config.brand.appName} order to our UK warehouse partner for packing.</p>
    <ul>${lineItemsHtml(order)}</ul>
    <p>You'll get another email when your parcel ships with tracking (if the carrier provides it).</p>
    <p><a href="${origin}">${config.brand.appName}</a></p>
  `;
  await sendEmail({
    to: order.email,
    subject: `We're packing your ${config.brand.appName} order`,
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

export async function sendShopOrderDeliveredEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  await sendEmail({
    to: order.email,
    subject: `Your ${config.brand.appName} order was delivered`,
    html: `
      <p>We hope your order arrived safely.</p>
      <ul>${lineItemsHtml(order)}</ul>
      <p>If anything is wrong, reply within 30 days for unused returns (see our <a href="${origin}/refunds">returns policy</a>).</p>
      <p><a href="${origin}">Shop again at ${config.brand.appName}</a></p>
    `,
  });
}

export async function sendShopReviewRequestEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  await sendEmail({
    to: order.email,
    subject: `How was your ${config.brand.appName} order?`,
    html: `
      <p>We'd love a quick note on how everything looked — reply to this email with a photo if you like.</p>
      <p><a href="${origin}">Visit ${config.brand.appName}</a></p>
    `,
  });
}

export async function sendShopAbandonedCheckoutEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  await sendEmail({
    to: order.email,
    subject: `Still thinking about your ${config.brand.appName} basket?`,
    html: `
      <p>You started checkout but didn't finish payment. Your basket is still waiting.</p>
      <ul>${lineItemsHtml(order)}</ul>
      <p><a href="${origin}/shop/cart">Return to your cart</a></p>
      <p style="font-size:12px;color:#666">You asked to hear about offers and reminders. Unsubscribe by replying STOP.</p>
    `,
  });
}

export async function sendShopOrderCancelledEmail(order: ShopOrder, refunded: boolean) {
  const { config } = await storeMailContext(order.storeId);
  const refundNote = refunded
    ? "<p>Any payment taken has been refunded to your original payment method.</p>"
    : "<p>No payment was taken for this order.</p>";
  await sendEmail({
    to: order.email,
    subject: `Order cancelled — ${config.brand.appName}`,
    html: `
      <p>Your ${config.brand.appName} order has been cancelled.</p>
      ${refundNote}
      <p>Questions? <a href="mailto:${config.brand.supportEmail}">${config.brand.supportEmail}</a></p>
    `,
  });
}

export async function sendShopRefundEmail(order: ShopOrder, amountPence: number) {
  const { config } = await storeMailContext(order.storeId);
  await sendEmail({
    to: order.email,
    subject: `Refund issued — ${config.brand.appName}`,
    html: `
      <p>We've processed a refund of <strong>${formatGbp(amountPence)}</strong> to your original payment method.</p>
      <p>It may take 5–10 working days to appear on your statement.</p>
      <p>Questions? <a href="mailto:${config.brand.supportEmail}">${config.brand.supportEmail}</a></p>
    `,
  });
}
