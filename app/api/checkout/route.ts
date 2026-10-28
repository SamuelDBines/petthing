import { randomUUID } from "crypto";
import { z } from "zod";
import { allPrintProductIds, getPrint, PRINTS, type PrintProductId } from "@/config/prints";
import {
  CHRISTMAS_PREORDER_PENCE,
  EXTRA_STYLES_COUNT,
  EXTRA_STYLES_PENCE,
  formatGbp,
  getTier,
  PRIORITY_PENCE,
} from "@/config/pricing";
import {
  PAWTRAITRY_BUMP_PRICE_PENCE,
  PAWTRAITRY_CANVAS_FREE_BAUBLE_MIN_PENCE,
} from "@/config/pawtraitry-promos";
import type { Preorder, PrintOrder } from "@/lib/domain";
import { markChristmasPaid, markExtraPaid, markPortraitPaid, markPrintPaid } from "@/lib/fulfillment";
import { jsonError, parseBody } from "@/lib/http";
import { rateLimits } from "@/lib/rateLimits";
import { clientIp, demoCheckoutAllowed, hashIp } from "@/lib/runtime";
import {
  createCheckoutSession,
  integrationIdentifier,
  openCheckoutSessionUrl,
  stripeCheckoutErrorResponse,
} from "@/lib/stripe/checkout";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import type { StoreBrand } from "@/lib/tenant/types";
import { publicOriginForStore } from "@/lib/tenant/origin";
import { getStore } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { metaAttributionBodySchema, metaContextFromBody } from "@/lib/meta/api-schema";
import { mergeCheckoutStripeMetadata } from "@/lib/meta/stripe-metadata";
import { metaAttributionFromRequest } from "@/lib/meta/purchase-from-session";
import { sendMetaInitiateCheckout } from "@/lib/meta/server-events";

const schema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("portrait"),
      orderId: z.string().uuid(),
      uploadToken: z.string().min(10),
      analyticsSessionId: z.string().uuid().optional(),
    })
    .merge(metaAttributionBodySchema),
  z.object({
    kind: z.literal("extra_styles"),
    token: z.string().min(10),
    styleIds: z.array(z.string()).min(1).max(EXTRA_STYLES_COUNT),
    analyticsSessionId: z.string().uuid().optional(),
  }),
  z.object({
    kind: z.literal("print"),
    token: z.string().min(10),
    productId: z.enum(allPrintProductIds() as [string, ...string[]]),
    assetId: z.string().uuid(),
    addPetBaubleBump: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("christmas"), email: z.string().email(), token: z.string().optional() }),
]);

async function openSession(args: {
  brand: StoreBrand;
  origin: string;
  kind: string;
  email: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
  successPath: string;
  cancelPath: string;
  idempotencyKey: string;
  integrationStableKey: string;
  collectShipping?: boolean;
  allowPromotionCodes?: boolean;
  mode?: "payment" | "subscription";
}) {
  const stripe = getStripe();
  const success = `${args.origin}${args.successPath}`;
  if (!stripe) {
    if (!demoCheckoutAllowed()) return jsonError("Payments are not configured yet.", 503);
    return { demo: true as const, url: success.replace("{CHECKOUT_SESSION_ID}", `demo_${args.idempotencyKey}`) };
  }
  try {
    const session = await createCheckoutSession({
      stripe,
      brand: args.brand,
      idempotencyKey: args.idempotencyKey,
      logoUrl: `${args.origin}${args.brand.logoPath}`,
      sessionParams: {
        mode: args.mode ?? "payment",
        customer_email: args.email,
        line_items: args.lineItems,
        success_url: success,
        cancel_url: `${args.origin}${args.cancelPath}`,
        metadata: args.metadata,
        integration_identifier: integrationIdentifier(args.kind, args.integrationStableKey),
        allow_promotion_codes: args.allowPromotionCodes ?? false,
        ...(args.collectShipping ? { shipping_address_collection: { allowed_countries: ["GB"] } } : {}),
      },
    });
    return { demo: false as const, url: session.url, sessionId: session.sessionId, livemode: session.livemode };
  } catch (error) {
    return stripeCheckoutErrorResponse(error);
  }
}

function line(name: string, amount: number, yearly = false): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "gbp",
      unit_amount: amount,
      product_data: { name },
      ...(yearly ? { recurring: { interval: "year" as const } } : {}),
    },
  };
}

export async function POST(request: Request) {
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  const storeId = await requestStoreId();
  const storeConfig = await loadStoreConfig(storeId);
  const brand = storeConfig.brand;
  const origin = publicOriginForStore(request, brand, storeId, storeConfig.domains);
  const limits = rateLimits();
  const limit = await store.hitRateLimit(
    `checkout:${storeId}:${hashIp(clientIp(request))}`,
    limits.checkoutPerHour,
    60 * 60 * 1000,
  );
  if (!limit.ok) return jsonError("Too many checkout attempts. Try again in an hour.", 429);
  const body = parsed.data;

  if (body.kind === "portrait") {
    const order = await store.getOrderByUploadToken(body.orderId, body.uploadToken);
    if (!order || order.status !== "pending_payment") return jsonError("Start again from the form.", 409);
    const uploads = (await store.listAssets(order.id)).filter((asset) => asset.kind === "upload");
    if (!uploads.length) return jsonError("Upload at least one photo first.");
    const pass = order.offer === "season_pass";
    const tier = getTier(order.tierId, storeConfig.catalog.tiers);
    const portraitPence = order.amountPence - (order.priority ? PRIORITY_PENCE : 0);
    const items = pass
      ? [line(`${brand.appName} season pass`, portraitPence, true)]
      : [line(`${brand.appName} · ${tier.name}`, portraitPence)];
    if (!pass && order.priority) items.push(line("Priority delivery", PRIORITY_PENCE));
    const jinglefoldPersonalised =
      order.storeId === "jinglefold" && Boolean(order.productMeta?.personalised);
    const stripe = getStripe();
    if (stripe && order.stripeCheckoutSessionId) {
      const existingUrl = await openCheckoutSessionUrl(stripe, order.stripeCheckoutSessionId);
      if (existingUrl) return Response.json({ url: existingUrl });
    }
    const metaCtx = body.kind === "portrait" ? metaContextFromBody(body) : null;
    const opened = await openSession({
      brand,
      origin,
      kind: pass ? "season" : "portrait",
      email: order.email,
      lineItems: items,
      metadata: mergeCheckoutStripeMetadata(
        {
          kind: pass ? "season_pass" : "portrait",
          orderId: order.id,
          storeId: order.storeId,
          visitorSessionId: body.analyticsSessionId ?? "",
        },
        metaCtx,
      ),
      mode: pass ? "subscription" : "payment",
      successPath: jinglefoldPersonalised
        ? `/results/${order.resultsToken}?session_id={CHECKOUT_SESSION_ID}`
        : "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancelPath: jinglefoldPersonalised ? `/results/${order.resultsToken}` : "/create?cancelled=1",
      idempotencyKey: `portrait-${order.id}-${order.amountPence}`,
      integrationStableKey: order.id,
      allowPromotionCodes: !order.referralCodeUsed,
      collectShipping: jinglefoldPersonalised,
    });
    if (opened instanceof Response) return opened;
    if (opened.demo) {
      const sessionId = `demo_${order.id}`;
      await markPortraitPaid(order.id, { sessionId, paymentIntentId: null, amountPence: order.amountPence });
      await store.addEvent({
        id: randomUUID(),
        storeId: order.storeId,
        type: "checkout",
        orderId: order.id,
        createdAt: new Date().toISOString(),
      });
      return Response.json({ url: `${origin}/checkout/success?session_id=${sessionId}` });
    }
    await store.updateOrder(order.id, {
      stripeCheckoutSessionId: opened.sessionId ?? null,
      stripeLivemode: opened.livemode,
    });
    await store.addEvent({
      id: randomUUID(),
      storeId: order.storeId,
      type: "checkout",
      orderId: order.id,
      createdAt: new Date().toISOString(),
    });
    if (metaCtx?.marketingConsent) {
      const reqMeta = metaAttributionFromRequest(request);
      void sendMetaInitiateCheckout({
        storeId: order.storeId,
        email: order.email,
        valuePence: order.amountPence,
        contentIds: [order.tierId, ...order.styleIds],
        ctx: metaCtx,
        clientIp: reqMeta.clientIp,
        userAgent: reqMeta.userAgent,
        eventSourceUrl: origin + (jinglefoldPersonalised ? `/results/${order.resultsToken}` : "/create"),
      }).catch((error) => console.error("Meta InitiateCheckout", error));
    }
    return Response.json({ url: opened.url });
  }

  if (body.kind === "extra_styles") {
    const order = await store.getOrderByToken(body.token);
    if (!order || order.status !== "delivered") return jsonError("That gallery is not ready.", 404);
    const themeStyles = (await import("@/config/themes")).getTheme(order.themeId)?.styles ?? [];
    const remaining = themeStyles.filter((style) => !order.styleIds.includes(style.id));
    const chosen = remaining.length ? body.styleIds : body.styleIds;
    if (remaining.length && chosen.length !== Math.min(EXTRA_STYLES_COUNT, remaining.length)) {
      return jsonError(`Choose ${Math.min(EXTRA_STYLES_COUNT, remaining.length)} styles.`);
    }
    if (remaining.length && chosen.some((id) => !remaining.some((style) => style.id === id))) {
      return jsonError("Choose styles you do not already have.");
    }
    if (!remaining.length && chosen.length !== EXTRA_STYLES_COUNT) return jsonError("Choose 3 styles for extra images.");
    const opened = await openSession({
      brand,
      origin,
      kind: "extra",
      email: order.email,
      lineItems: [line(`${brand.appName} · 3 more styles`, EXTRA_STYLES_PENCE)],
      metadata: {
        kind: "extra_styles",
        orderId: order.id,
        styleIds: chosen.join(","),
        storeId: order.storeId,
        visitorSessionId: body.analyticsSessionId ?? "",
      },
      successPath: `/results/${order.resultsToken}?session_id={CHECKOUT_SESSION_ID}`,
      cancelPath: `/results/${order.resultsToken}`,
      idempotencyKey: `extra-${order.id}-${chosen.slice().sort().join("-")}`,
      integrationStableKey: `${order.id}-${chosen.slice().sort().join("-")}`,
      allowPromotionCodes: true,
    });
    if (opened instanceof Response) return opened;
    if (opened.demo) {
      const sessionId = `demo_extra_${order.id}_${chosen.join("-")}`;
      await markExtraPaid(order.id, chosen, { sessionId, paymentIntentId: null, amountPence: EXTRA_STYLES_PENCE });
      return Response.json({ url: `${origin}/results/${order.resultsToken}` });
    }
    return Response.json({ url: opened.url });
  }

  if (body.kind === "print") {
    const order = await store.getOrderByToken(body.token);
    if (!order || order.status !== "delivered") return jsonError("That gallery is not ready.", 404);
    const asset = (await store.listAssets(order.id)).find((item) => item.id === body.assetId && item.kind === "result");
    if (!asset) return jsonError("Choose one of your portraits.");
    if (!getStripe()) return jsonError("A puzzle order needs Stripe Checkout so we can collect a UK shipping address.", 503);
    const product = getPrint(body.productId as PrintProductId);
    const existingPrints = await store.listPrints(order.id);
    let print = existingPrints.find(
      (item) =>
        item.assetId === asset.id &&
        item.productId === product.id &&
        item.status === "pending_payment",
    );
    if (!print) {
      print = {
        id: randomUUID(),
        orderId: order.id,
        productId: product.id,
        assetId: asset.id,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        prodigiOrderId: null,
        status: "pending_payment",
        shipping: null,
        error: null,
        createdAt: new Date().toISOString(),
      };
      await store.addPrint(print);
    }
    const stripe = getStripe();
    if (stripe && print.stripeCheckoutSessionId) {
      const existingUrl = await openCheckoutSessionUrl(stripe, print.stripeCheckoutSessionId);
      if (existingUrl) return Response.json({ url: existingUrl });
    }
    const lineItems = [line(`${brand.appName} · ${product.name}`, product.pricePence)];
    const promos = storeConfig.catalog.pawtraitryPromos;
    const canvasProduct = product.id.startsWith("canvas_");
    if (body.addPetBaubleBump) {
      lineItems.push(line("Personalised pet bauble add-on", PAWTRAITRY_BUMP_PRICE_PENCE));
    }
    if (
      promos?.freeBaubleWithCanvasEnabled &&
      canvasProduct &&
      product.pricePence >= PAWTRAITRY_CANVAS_FREE_BAUBLE_MIN_PENCE
    ) {
      lineItems.push(line("Complimentary pet bauble (canvas promo)", 0));
    }
    const opened = await openSession({
      brand,
      origin,
      kind: "print",
      email: order.email,
      lineItems,
      metadata: { kind: "print", orderId: order.id, printId: print.id, storeId: order.storeId },
      successPath: `/results/${order.resultsToken}?session_id={CHECKOUT_SESSION_ID}`,
      cancelPath: `/results/${order.resultsToken}`,
      idempotencyKey: `print-${print.id}`,
      integrationStableKey: print.id,
      collectShipping: true,
      allowPromotionCodes: true,
    });
    if (opened instanceof Response) return opened;
    await store.updatePrint(print.id, { stripeCheckoutSessionId: opened.sessionId ?? null });
    return Response.json({ url: opened.url });
  }

  const email = body.email.trim().toLowerCase();
  const linked = body.token ? await store.getOrderByToken(body.token) : null;
  const preorder: Preorder = {
    id: randomUUID(),
    storeId,
    orderId: linked?.id ?? null,
    email,
    themeId: "christmas",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountPence: CHRISTMAS_PREORDER_PENCE,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
  };
  await store.addPreorder(preorder);
  const { recordEmailSignup } = await import("@/lib/crm/record-signup");
  await recordEmailSignup({
    storeId,
    email: preorder.email,
    source: "christmas_preorder",
    marketingConsent: false,
  });
  const opened = await openSession({
    brand,
    origin,
    kind: "christmas",
    email,
    lineItems: [line(`${brand.appName} · Christmas pre-order`, CHRISTMAS_PREORDER_PENCE)],
    metadata: { kind: "christmas", preorderId: preorder.id, storeId },
    successPath: "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancelPath: "/",
    idempotencyKey: `christmas-${preorder.id}`,
    integrationStableKey: preorder.id,
    allowPromotionCodes: true,
  });
  if (opened instanceof Response) return opened;
  if (opened.demo) {
    const sessionId = `demo_${preorder.id}`;
    await store.updatePreorder(preorder.id, { stripeCheckoutSessionId: sessionId, status: "pending_payment" });
    await markChristmasPaid(preorder.id, { sessionId, paymentIntentId: null, amountPence: CHRISTMAS_PREORDER_PENCE });
    return Response.json({ url: `${origin}/checkout/success?session_id=${sessionId}` });
  }
  await store.updatePreorder(preorder.id, { stripeCheckoutSessionId: opened.sessionId ?? null });
  return Response.json({ url: opened.url, price: formatGbp(CHRISTMAS_PREORDER_PENCE), prints: PRINTS.length });
}
