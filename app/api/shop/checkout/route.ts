import { randomUUID } from "crypto";
import { z } from "zod";
import { fixmongerShippingPence, FIXMONGER_DELIVERY } from "@/config/catalogue/pricing-seed";
import { JINGLEFOLD_DELIVERY, jinglefoldShippingPence } from "@/config/jinglefold";
import { getCatalogueProduct, listCatalogueProducts } from "@/lib/catalogue/products";
import { shopOrderLinesForProduct } from "@/lib/catalogue/order-lines";
import type { ShopOrder, ShopOrderLine } from "@/lib/catalogue/types";
import { formatGbp } from "@/config/pricing";
import { jsonError, parseBody } from "@/lib/http";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, demoCheckoutAllowed, hashIp, integrationIdentifier } from "@/lib/runtime";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { publicOriginForStore } from "@/lib/tenant/origin";
import { getStore } from "@/lib/store";
import { checkoutSessionForStore } from "@/lib/stripe/store-checkout";
import { getStripe } from "@/lib/stripe";
import { markShopOrderPaid } from "@/lib/shop/fulfillment";
import type Stripe from "stripe";

const schema = z.object({
  email: z.string().email(),
  lines: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1),
  marketingConsent: z.boolean().optional(),
});

async function openSession(args: {
  brand: import("@/lib/tenant/types").StoreBrand;
  origin: string;
  email: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
  idempotencyKey: string;
  shippingPence: number;
}) {
  const stripe = getStripe();
  const success = `${args.origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`;
  if (!stripe) {
    if (!demoCheckoutAllowed()) return jsonError("Payments are not configured yet.", 503);
    return { demo: true as const, url: success.replace("{CHECKOUT_SESSION_ID}", `demo_${args.idempotencyKey}`) };
  }
  const session = await stripe.checkout.sessions.create(
    checkoutSessionForStore(
      args.brand,
      {
      mode: "payment",
      customer_email: args.email,
      line_items: args.lineItems,
      success_url: success,
      cancel_url: `${args.origin}/shop/cart`,
      metadata: args.metadata,
      integration_identifier: integrationIdentifier("shop"),
      shipping_address_collection: { allowed_countries: ["GB"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: args.shippingPence, currency: "gbp" },
            display_name:
              args.shippingPence === 0
                ? "Free UK delivery"
                : `UK delivery (${formatGbp(args.shippingPence)})`,
          },
        },
      ],
    },
      { logoUrl: `${args.origin}${args.brand.logoPath}` },
    ),
    { idempotencyKey: args.idempotencyKey },
  );
  if (!session.url) return jsonError("Stripe did not return a checkout URL.", 502);
  return { demo: false as const, url: session.url, sessionId: session.id };
}

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue" && config.storeType !== "christmas") {
    return jsonError("This store does not sell catalogue items.", 400);
  }
  const store = getStore();
  const limits = rateLimits();
  const limit = await store.hitRateLimit(
    `shop-checkout:${storeId}:${hashIp(clientIp(request))}`,
    limits.checkoutPerHour,
    60 * 60 * 1000,
  );
  if (!limit.ok) return jsonError("Too many checkout attempts. Try again in an hour.", 429);

  const lines: ShopOrderLine[] = [];
  const pricedLines: { product: NonNullable<Awaited<ReturnType<typeof getCatalogueProduct>>>; quantity: number }[] = [];
  let subtotal = 0;
  for (const line of parsed.data.lines) {
    const product = await getCatalogueProduct(storeId, line.productId);
    if (!product || !product.active) return jsonError(`Unknown product: ${line.productId}`);
    if (product.stock < line.quantity) return jsonError(`${product.name} is out of stock.`);
    pricedLines.push({ product, quantity: line.quantity });
    lines.push(...shopOrderLinesForProduct(product, line.quantity));
    subtotal += product.pricePence * line.quantity;
  }

  const shippingPence =
    storeId === "jinglefold" ? jinglefoldShippingPence(subtotal) : fixmongerShippingPence(subtotal);
  const deliveryMeta =
    storeId === "jinglefold"
      ? { freeOver: JINGLEFOLD_DELIVERY.freeDeliveryOverPence }
      : { freeOver: FIXMONGER_DELIVERY.freeDeliveryOverPence };
  const orderTotalPence = subtotal + shippingPence;

  const shopOrder: ShopOrder = {
    id: randomUUID(),
    storeId,
    email: parsed.data.email.trim().toLowerCase(),
    status: "pending_payment",
    lines,
    shipping: null,
    amountPence: orderTotalPence,
    shippingPence,
    stripeCheckoutSessionId: null,
    trackingNumber: null,
    supplierBatchId: null,
    marketingConsent: parsed.data.marketingConsent ?? false,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  await store.createShopOrder(shopOrder);

  const stripeItems: Stripe.Checkout.SessionCreateParams.LineItem[] = pricedLines.map(({ product, quantity }) => {
    return {
      quantity,
      price_data: {
        currency: "gbp",
        unit_amount: product.pricePence,
        product_data: { name: product.name },
      },
    };
  });

  const origin = publicOriginForStore(request, config.brand, storeId, config.domains);
  const opened = await openSession({
    brand: config.brand,
    origin,
    email: shopOrder.email,
    lineItems: stripeItems,
    metadata: { kind: "shop", shopOrderId: shopOrder.id, storeId },
    idempotencyKey: `shop-${shopOrder.id}`,
    shippingPence,
  });
  if (opened instanceof Response) return opened;
  if (opened.demo) {
    const sessionId = `demo_shop_${shopOrder.id}`;
    await markShopOrderPaid(shopOrder.id, {
      id: sessionId,
      payment_status: "paid",
      metadata: { kind: "shop", shopOrderId: shopOrder.id, storeId },
      amount_total: orderTotalPence,
      collected_information: {
        shipping_details: {
          name: "Demo Customer",
          address: { line1: "1 High Street", line2: "", city: "London", postal_code: "SW1A 1AA", country: "GB" },
        },
      },
    } as unknown as Stripe.Checkout.Session);
    return Response.json({
      url: `${origin}/shop/success?session_id=${sessionId}`,
      total: formatGbp(orderTotalPence),
      subtotal: formatGbp(subtotal),
      shipping: formatGbp(shippingPence),
    });
  }
  await store.updateShopOrder(shopOrder.id, { stripeCheckoutSessionId: opened.sessionId ?? null });
  return Response.json({
    url: opened.url,
    total: formatGbp(orderTotalPence),
    subtotal: formatGbp(subtotal),
    shipping: formatGbp(shippingPence),
    freeDeliveryOver: formatGbp(deliveryMeta.freeOver),
  });
}
