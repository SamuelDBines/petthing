import { formatGbp } from "@/config/pricing";
import type { BrandedEmailKind, EmailStoreId } from "@/lib/email/templates/constants";
import { MARKETING_EMAIL_KINDS } from "@/lib/email/templates/constants";
import { renderBrandedEmailHtml, renderBrandedEmailText, type EmailLayoutOptions } from "@/lib/email/templates/layout";
import { loadStoreConfig } from "@/lib/tenant/context";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

export type OrderLineView = {
  name: string;
  quantity: number;
  unitPricePence: number;
  imageUrl?: string;
};

export type BrandedEmailPayload = {
  orderRef?: string;
  lines?: OrderLineView[];
  subtotalPence?: number;
  shippingPence?: number;
  totalPence?: number;
  carrier?: string;
  trackingUrl?: string;
  trackingNumber?: string;
  galleryUrl?: string;
  cartUrl?: string;
  firstName?: string;
  unsubscribeUrl?: string;
  /** When false, order confirmation uses digital delivery copy (no shipping email). Defaults to physical. */
  hasPhysicalItems?: boolean;
};

export type RenderedBrandedEmail = {
  subject: string;
  html: string;
  text: string;
  preheader: string;
  fromRole: "orders" | "hello";
  listUnsubscribe?: string;
};

export async function renderBrandedEmail(
  storeId: EmailStoreId,
  kind: BrandedEmailKind,
  payload: BrandedEmailPayload,
): Promise<RenderedBrandedEmail> {
  const config = await loadStoreConfig(storeId);
  const origin = storeCanonicalOrigin(storeId, config.brand, config.domains);
  const marketing = MARKETING_EMAIL_KINDS.includes(kind);
  const fromRole = marketing ? "hello" : "orders";
  const unsubscribeUrl = marketing ? payload.unsubscribeUrl ?? `${origin}/api/marketing/unsubscribe?email=placeholder` : undefined;

  const built = buildContent(storeId, kind, config.brand.appName, origin, payload);
  const layoutOpts: EmailLayoutOptions = {
    brand: config.brand,
    origin,
    preheader: built.preheader,
    title: built.subject,
    bodyHtml: built.bodyHtml,
    cta: built.cta,
    unsubscribeUrl,
  };

  return {
    subject: built.subject,
    html: renderBrandedEmailHtml(layoutOpts),
    text: renderBrandedEmailText(layoutOpts),
    preheader: built.preheader,
    fromRole,
    listUnsubscribe: unsubscribeUrl,
  };
}

function buildContent(
  storeId: EmailStoreId,
  kind: BrandedEmailKind,
  appName: string,
  origin: string,
  payload: BrandedEmailPayload,
) {
  const hi = payload.firstName ? `Hi ${escape(payload.firstName)},` : "Hi there,";
  switch (kind) {
    case "order_confirmation": {
      const physical = payload.hasPhysicalItems !== false;
      const thanks = physical
        ? `Thanks for shopping with ${appName}. We've received your order.`
        : `Thanks for your ${appName} order.`;
      const followUp = physical
        ? "We'll email you when your order ships."
        : "We'll email you when your private gallery is ready to view and download.";
      const cta = physical
        ? { label: "View your order", href: `${origin}/shop/orders` }
        : payload.galleryUrl
          ? { label: "Open your gallery", href: payload.galleryUrl }
          : { label: `Visit ${appName}`, href: origin };
      return {
        subject: `Your ${appName} order confirmation`,
        preheader: `Order ${payload.orderRef ?? ""} confirmed — we're on it.`,
        bodyHtml: `${p(hi)}${p(thanks)}${orderTable(payload)}${p(followUp)}`,
        cta,
      };
    }
    case "portrait_ready":
      return {
        subject: `Your ${appName} preview is ready`,
        preheader: "Your private gallery link is inside — download before it expires.",
        bodyHtml: `${p(hi)}${p(`Your personalised ${appName} portraits are ready to view and download.`)}${p("The link is private — don't share it if you want to keep full-resolution files to yourself.")}`,
        cta: { label: "Open your gallery", href: payload.galleryUrl ?? `${origin}/results/sample` },
      };
    case "shipped":
      return {
        subject: `Your ${appName} order is on its way`,
        preheader: payload.trackingNumber ? `Tracking: ${payload.trackingNumber}` : "Your parcel has left our UK partner.",
        bodyHtml: `${p(hi)}${p(`Good news — your ${appName} order has been dispatched.`)}${trackingBlock(payload)}${linesList(payload)}`,
        cta: payload.trackingUrl
          ? { label: "Track your parcel", href: payload.trackingUrl }
          : { label: `Visit ${appName}`, href: origin },
      };
    case "delivered_review":
      return {
        subject: `How was your ${appName} order?`,
        preheader: "Tell us how everything looked — we read every reply.",
        bodyHtml: `${p(hi)}${p(`We hope your order arrived safely. If anything isn't right, reply within 30 days for unused returns.`)}${linesList(payload)}${p("A quick photo and a sentence helps other shoppers — reply to this email anytime.")}`,
        cta: { label: `Shop ${appName} again`, href: origin },
      };
    case "welcome":
      return {
        subject: `Welcome to ${appName}`,
        preheader: storeWelcomePreheader(storeId),
        bodyHtml: `${p(hi)}${p(welcomeBody(storeId, appName))}${p(`You'll hear from us at ${appName} with practical tips and occasional offers — always with an easy unsubscribe.`)}`,
        cta: { label: `Explore ${appName}`, href: origin },
      };
    case "abandoned_checkout":
      return {
        subject: `Still thinking about your ${appName} basket?`,
        preheader: "Your items are still waiting — checkout takes a minute.",
        bodyHtml: `${p(hi)}${p(`You started checkout but didn't finish payment.`)}${linesList(payload)}${p("Your basket is saved — complete checkout when you're ready.")}`,
        cta: { label: "Return to your cart", href: payload.cartUrl ?? `${origin}/shop/cart` },
      };
    default:
      return { subject: appName, preheader: appName, bodyHtml: p(hi) };
  }
}

function storeWelcomePreheader(storeId: EmailStoreId) {
  if (storeId === "fixmonger") return "Windows open, bugs out — screening tips from Fixmonger.";
  if (storeId === "jinglefold") return "Personalised Christmas updates from Jinglefold.";
  return "Portrait tips and gentle reminders from Pawtraitry.";
}

function welcomeBody(storeId: EmailStoreId, appName: string) {
  if (storeId === "fixmonger") {
    return `Welcome to ${appName}. We're here to help you keep windows and doors open without letting insects — or the cold — win.`;
  }
  if (storeId === "jinglefold") {
    return `Welcome to ${appName}. We'll share seasonal deadlines, styling ideas, and personalised gift inspiration.`;
  }
  return `Welcome to ${appName}. We'll send portrait inspiration, order updates, and occasional offers — never spam.`;
}

function orderTable(payload: BrandedEmailPayload) {
  const lines = payload.lines ?? [];
  if (!lines.length) return "";
  const rows = lines
    .map((line) => {
      const img = line.imageUrl
        ? `<img src="${line.imageUrl}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;" />`
        : "";
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e7e1d8;vertical-align:top;width:64px;">${img}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e7e1d8;vertical-align:top;font-size:15px;line-height:22px;">
          <strong>${escape(line.name)}</strong><br />Qty ${line.quantity} · ${formatGbp(line.unitPricePence * line.quantity)}
        </td>
      </tr>`;
    })
    .join("");
  const shipping =
    payload.shippingPence === 0
      ? "Free UK delivery"
      : payload.shippingPence != null
        ? formatGbp(payload.shippingPence)
        : "";
  const totals =
    payload.totalPence != null
      ? `<tr><td colspan="2" style="padding:16px 0 0 0;font-size:15px;line-height:22px;">
        ${payload.subtotalPence != null ? `<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${formatGbp(payload.subtotalPence)}</span></div>` : ""}
        ${shipping ? `<div style="display:flex;justify-content:space-between;margin-top:6px;"><span>Shipping</span><span>${shipping}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-weight:700;"><span>Total</span><span>${formatGbp(payload.totalPence)}</span></div>
        ${payload.orderRef ? `<p style="margin:12px 0 0 0;font-size:13px;color:#4a433c;">Order ref: ${escape(payload.orderRef)}</p>` : ""}
      </td></tr>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">${rows}${totals}</table>`;
}

function linesList(payload: BrandedEmailPayload) {
  const lines = payload.lines ?? [];
  if (!lines.length) return "";
  const items = lines.map((l) => `<li>${escape(l.name)} × ${l.quantity}</li>`).join("");
  return `<ul style="margin:16px 0;padding-left:20px;">${items}</ul>`;
}

function trackingBlock(payload: BrandedEmailPayload) {
  if (!payload.trackingNumber && !payload.carrier) {
    return p("Your parcel is on its way — tracking will follow if your carrier provides it.");
  }
  return p(
    `Carrier: <strong>${escape(payload.carrier ?? "UK carrier")}</strong><br />Tracking: <strong>${escape(payload.trackingNumber ?? "—")}</strong>`,
  );
}

function p(html: string) {
  return `<p style="margin:0 0 16px 0;">${html}</p>`;
}

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function shopOrderToPayload(order: import("@/lib/catalogue/types").ShopOrder, origin: string): BrandedEmailPayload {
  return {
    orderRef: order.id.slice(0, 8).toUpperCase(),
    hasPhysicalItems: true,
    lines: order.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPricePence: line.unitPricePence,
    })),
    subtotalPence: order.amountPence - order.shippingPence,
    shippingPence: order.shippingPence,
    totalPence: order.amountPence,
    cartUrl: `${origin}/shop/cart`,
  };
}
