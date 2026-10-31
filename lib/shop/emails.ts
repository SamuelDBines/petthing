import { formatGbp } from "@/config/pricing";
import type { ShopOrder } from "@/lib/catalogue/types";
import { sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { renderBrandedEmail, shopOrderToPayload } from "@/lib/email/templates/render";
import type { EmailStoreId } from "@/lib/email/templates/constants";
import { loadStoreConfig } from "@/lib/tenant/context";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

async function storeMailContext(storeId: string) {
  const config = await loadStoreConfig(storeId);
  const origin = storeCanonicalOrigin(storeId, config.brand, config.domains);
  return { config, origin };
}

async function sendRendered(
  order: ShopOrder,
  to: string,
  rendered: Awaited<ReturnType<typeof renderBrandedEmail>>,
) {
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      storeId: order.storeId,
      fromRole: rendered.fromRole,
      listUnsubscribe: rendered.listUnsubscribe,
    }),
  );
}

export async function sendShopOrderConfirmationEmail(order: ShopOrder) {
  const { origin } = await storeMailContext(order.storeId);
  const rendered = await renderBrandedEmail(order.storeId as EmailStoreId, "order_confirmation", shopOrderToPayload(order, origin));
  await sendRendered(order, order.email, rendered);
}

export async function sendShopOrderSubmittedToSupplierEmail(order: ShopOrder) {
  const { config, origin } = await storeMailContext(order.storeId);
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: `We're packing your ${config.brand.appName} order`,
      html: `<p>We've passed your order to our UK warehouse partner for packing.</p><p><a href="${origin}">${config.brand.appName}</a></p>`,
      storeId: order.storeId,
    }),
  );
}

export async function sendShopOrderDispatchedEmail(order: ShopOrder) {
  const { origin } = await storeMailContext(order.storeId);
  const payload = {
    ...shopOrderToPayload(order, origin),
    trackingNumber: order.trackingNumber ?? undefined,
    trackingUrl: order.trackingNumber ? `https://www.royalmail.com/track-your-item#/${order.trackingNumber}` : undefined,
  };
  const rendered = await renderBrandedEmail(order.storeId as EmailStoreId, "shipped", payload);
  await sendRendered(order, order.email, rendered);
}

export async function sendShopOrderDeliveredEmail(order: ShopOrder) {
  const { origin } = await storeMailContext(order.storeId);
  const rendered = await renderBrandedEmail(order.storeId as EmailStoreId, "delivered_review", shopOrderToPayload(order, origin));
  await sendRendered(order, order.email, rendered);
}

export async function sendShopReviewRequestEmail(order: ShopOrder) {
  await sendShopOrderDeliveredEmail(order);
}

export async function sendShopAbandonedCheckoutEmail(order: ShopOrder) {
  const { origin } = await storeMailContext(order.storeId);
  const rendered = await renderBrandedEmail(
    order.storeId as EmailStoreId,
    "abandoned_checkout",
    shopOrderToPayload(order, origin),
  );
  await sendRendered(order, order.email, rendered);
}

export async function sendShopWelcomeEmail(args: {
  storeId: string;
  email: string;
  firstName?: string | null;
  stripeLivemode?: boolean | null;
  requestHost?: string | null;
}) {
  const rendered = await renderBrandedEmail(args.storeId as EmailStoreId, "welcome", {
    firstName: args.firstName ?? undefined,
    unsubscribeUrl: `${(await storeMailContext(args.storeId)).origin}/api/marketing/unsubscribe`,
  });
  await sendEmail(
    withEmailDelivery(
      { stripeLivemode: args.stripeLivemode ?? false, requestHost: args.requestHost },
      {
        to: args.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        storeId: args.storeId,
        fromRole: rendered.fromRole,
        listUnsubscribe: rendered.listUnsubscribe,
      },
    ),
  );
}

export async function sendPortraitReadyEmail(args: {
  storeId: EmailStoreId;
  email: string;
  galleryUrl: string;
  subject?: string;
  stripeLivemode?: boolean | null;
  requestHost?: string | null;
}) {
  const rendered = await renderBrandedEmail(args.storeId, "portrait_ready", {
    galleryUrl: args.galleryUrl,
  });
  await sendEmail(
    withEmailDelivery(
      { stripeLivemode: args.stripeLivemode ?? false, requestHost: args.requestHost },
      {
        to: args.email,
        subject: args.subject ?? rendered.subject,
        html: rendered.html,
        text: rendered.text,
        storeId: args.storeId,
        fromRole: rendered.fromRole,
      },
    ),
  );
}

export async function sendShopOrderCancelledEmail(
  order: ShopOrder,
  refunded: boolean,
  options?: { supplierCancelRequested?: boolean },
) {
  const { config } = await storeMailContext(order.storeId);
  const refundNote = refunded
    ? "<p>Any payment taken has been refunded to your original payment method.</p>"
    : refundableNote(order);
  const supplierNote = options?.supplierCancelRequested
    ? `<p>We have requested that our supplier cancel fulfilment. If you still receive a parcel, contact <a href="mailto:${config.brand.supportEmail}">${config.brand.supportEmail}</a>.</p>`
    : "";
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: `Order cancelled: ${config.brand.appName}`,
      html: `<p>Your ${config.brand.appName} order has been cancelled.</p>${supplierNote}${refundNote}`,
      storeId: order.storeId,
    }),
  );
}

function refundableNote(order: ShopOrder) {
  if (order.paidAt && (order.amountRefundedPence ?? 0) < order.amountPence) {
    return "<p>Your payment is being refunded separately.</p>";
  }
  return "<p>No payment was taken for this order.</p>";
}

export async function sendShopRefundEmail(order: ShopOrder, amountPence: number) {
  const { config } = await storeMailContext(order.storeId);
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: `Refund issued: ${config.brand.appName}`,
      html: `<p>We've processed a refund of <strong>${formatGbp(amountPence)}</strong>.</p>`,
      storeId: order.storeId,
    }),
  );
}
