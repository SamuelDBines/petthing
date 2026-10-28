import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { APP_NAME } from "@/config/brand";
import { getPrint } from "@/config/prints";
import { EXTRA_IMAGES_PER_STYLE } from "@/config/pricing";
import { getTheme } from "@/config/themes";
import { putBlob, readBlob, signedBlobUrl } from "@/lib/blobs";
import type { Order, PrintOrder, Shipping } from "@/lib/domain";
import { alertAdmin, christmasEmail, sendEmail } from "@/lib/email";
import { orderEmailDelivery, withEmailDelivery } from "@/lib/email/delivery-context";
import { enqueueForOrder, enqueuePlan, scheduleOrderGeneration } from "@/lib/generation";
import { submitPrintOrder } from "@/lib/prodigi";
import { composePrintArea } from "@/lib/print-compose";
import { isHandPaintedTierId } from "@/config/paintings";
import { createHandPaintedWorkflow } from "@/lib/handPainted";
import { loadStoreConfig } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";
import { getStripeForStore, paymentIntentId } from "@/lib/stripe";
import { manualReviewEnabled } from "@/lib/runtime";
import { reviewReadyEmail } from "@/lib/email";

type PaidArgs = {
  sessionId: string;
  paymentIntentId: string | null;
  amountPence: number | null;
  stripeLivemode?: boolean | null;
};

function rememberPayment(order: Order, args: PaidArgs, kind: string): Order["payments"] {
  if (order.payments.some((payment) => payment.sessionId === args.sessionId)) return order.payments;
  return [
    ...order.payments,
    {
      sessionId: args.sessionId,
      paymentIntentId: args.paymentIntentId,
      amountPence: args.amountPence ?? 0,
      kind,
      createdAt: new Date().toISOString(),
    },
  ];
}

async function rewardReferrer(order: Order) {
  if (!order.referralCodeUsed || order.referralRewardGranted) return;
  const store = getStore();
  const owner = await store.getOrderByReferralCode(order.referralCodeUsed);
  if (!owner || owner.id === order.id || owner.status === "pending_payment" || owner.status === "refunded") {
    await store.updateOrder(order.id, { referralRewardGranted: true });
    return;
  }
  const theme = getTheme(owner.themeId);
  const missing = theme?.styles.map((style) => style.id).filter((id) => !owner.styleIds.includes(id)) ?? [];
  const styleId = missing[0] ?? owner.styleIds[0];
  if (styleId) {
    await store.updateOrder(owner.id, { styleIds: missing[0] ? [...owner.styleIds, styleId] : owner.styleIds });
    await enqueuePlan(owner.id, [{ styleId, count: 2 }], true);
    await sendEmail(
      withEmailDelivery(orderEmailDelivery(owner), {
        to: owner.email,
        subject: `A friend used your ${APP_NAME} code`,
        html: "<p>They got 20% off. Your free extra style is being painted, and we’ll email you when it lands in the same gallery.</p>",
        storeId: owner.storeId,
      }),
    );
  }
  await store.updateOrder(order.id, { referralRewardGranted: true });
}

export async function markPortraitPaid(orderId: string, args: PaidArgs) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status === "refunded") return;
  if (order.processedSessions.includes(args.sessionId)) return;
  const payments = rememberPayment(order, args, "portrait");
  await store.updateOrder(order.id, {
    stripeCheckoutSessionId: args.sessionId,
    stripePaymentIntentId: order.stripePaymentIntentId ?? args.paymentIntentId,
    amountPence: args.amountPence ?? order.amountPence,
    processedSessions: [...order.processedSessions, args.sessionId],
    payments,
    failureReason: null,
  });
  const freshAfterPay = await store.getOrder(order.id);
  if (freshAfterPay && isHandPaintedTierId(freshAfterPay.tierId)) {
    const config = await loadStoreConfig(freshAfterPay.storeId);
    await store.updateOrder(freshAfterPay.id, { status: "review" });
    await createHandPaintedWorkflow(freshAfterPay, config.brand.appName);
  } else {
    const jobs = await store.listJobs(order.id);
    let kickGeneration = true;
    if (order.storeId === "jinglefold" && order.productMeta?.personalised && jobs.some((j) => j.status === "done")) {
      kickGeneration = false;
      if (manualReviewEnabled()) {
        await store.updateOrder(order.id, { status: "review", failureReason: null });
        const config = await loadStoreConfig(order.storeId);
        const { storeCanonicalOrigin } = await import("@/lib/tenant/origin");
        const origin = storeCanonicalOrigin(order.storeId, config.brand, config.domains);
        await alertAdmin(
          "Jinglefold personalised order ready for approval",
          reviewReadyEmail(`${origin}/admin`, order.email),
          order.storeId,
        );
      } else {
        const { deliverOrder } = await import("@/lib/generation");
        await deliverOrder(order.id);
      }
    } else if (!jobs.length) {
      const fresh = await store.getOrder(order.id);
      if (fresh) await enqueueForOrder(fresh);
    }
    if (kickGeneration) scheduleOrderGeneration(order.id);
  }
  await store.addEvent({
    id: randomUUID(),
    storeId: order.storeId,
    type: "paid",
    orderId: order.id,
    createdAt: new Date().toISOString(),
  });
  const rewarded = await store.getOrder(order.id);
  if (rewarded) await rewardReferrer(rewarded);
}

export async function markExtraPaid(orderId: string, styleIds: string[], args: PaidArgs) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status === "refunded") return;
  if (order.processedSessions.includes(args.sessionId)) return;
  await store.updateOrder(order.id, {
    styleIds: Array.from(new Set([...order.styleIds, ...styleIds])),
    processedSessions: [...order.processedSessions, args.sessionId],
    payments: rememberPayment(order, args, "extra_styles"),
  });
  await enqueuePlan(
    order.id,
    styleIds.map((styleId) => ({ styleId, count: EXTRA_IMAGES_PER_STYLE })),
  );
  scheduleOrderGeneration(order.id);
}

function shippingFrom(session: Stripe.Checkout.Session): Shipping | null {
  const details = session.collected_information?.shipping_details;
  const address = details?.address;
  if (!details?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) return null;
  return {
    name: details.name,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    postalCode: address.postal_code,
    countryCode: address.country,
  };
}

export async function markPrintPaid(printId: string, session: Stripe.Checkout.Session, args: PaidArgs) {
  const store = getStore();
  const printIds = [printId];
  const addonPrintId = session.metadata?.addonPrintId?.trim();
  if (addonPrintId && addonPrintId !== printId) printIds.push(addonPrintId);

  const shipping = shippingFrom(session);
  const prints: PrintOrder[] = [];
  for (const id of printIds) {
    const row = (await store.listPrints()).find((item) => item.id === id);
    if (!row || row.status === "submitted") continue;
    prints.push(row);
  }
  if (!prints.length) return;

  const order = await store.getOrder(prints[0]!.orderId);
  if (!shipping || shipping.countryCode !== "GB") {
    for (const row of prints) {
      await store.updatePrint(row.id, { status: "failed", error: "UK shipping only at launch.", shipping });
    }
    await alertAdmin(
      "Print order needs a UK address",
      `<p>${order?.email ?? prints[0]!.orderId}</p>`,
      order?.storeId,
    );
    return;
  }

  for (const row of prints) {
    await store.updatePrint(row.id, {
      status: "paid",
      shipping,
      stripePaymentIntentId: args.paymentIntentId,
      error: null,
    });
  }
  if (order) {
    await store.updateOrder(order.id, {
      processedSessions: order.processedSessions.includes(args.sessionId)
        ? order.processedSessions
        : [...order.processedSessions, args.sessionId],
      payments: rememberPayment(order, args, "print"),
    });
  }

  let emailed = false;
  for (const row of prints) {
    try {
      await fulfillPrintToProdigi(row, order, shipping);
      if (order && !emailed) {
        emailed = true;
        await sendEmail(
          withEmailDelivery(orderEmailDelivery(order), {
            to: order.email,
            subject: `Your ${APP_NAME} print is with the printer`,
            html: "<p>We’ve sent your order to our UK print partner. It’s made to order, then posted. That usually takes a few days plus delivery.</p>",
            storeId: order.storeId,
          }),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prodigi failed";
      await store.updatePrint(row.id, { status: "failed", error: message });
      await alertAdmin("Prodigi order failed", `<p>${message}</p>`, order?.storeId);
    }
  }
}

async function fulfillPrintToProdigi(print: PrintOrder, order: Order | null | undefined, shipping: Shipping) {
  const store = getStore();
  const asset = order ? (await store.listAssets(order.id)).find((item) => item.id === print.assetId) : null;
  const portrait = asset ? await readBlob(asset.bucket, asset.storagePath) : null;
  if (!portrait) throw new Error("The chosen portrait is missing");
  const product = getPrint(print.productId);
  const assets = [];
  for (const area of product.areas) {
    const bytes = await composePrintArea(product, area, portrait.bytes);
    const storagePath = `prints/${print.id}/${area.printArea}.jpg`;
    await putBlob("results", storagePath, bytes, "image/jpeg");
    assets.push({ printArea: area.printArea, url: await signedBlobUrl("results", storagePath, 60 * 60 * 48) });
  }
  const result = await submitPrintOrder({
    storeId: order?.storeId ?? "pawtraitry",
    stripeLivemode: order?.stripeLivemode,
    product,
    shipping,
    assets,
    merchantReference: print.id,
  });
  await store.updatePrint(print.id, { status: "submitted", prodigiOrderId: result.prodigiOrderId, error: null });
}

export async function markChristmasPaid(preorderId: string, args: PaidArgs) {
  const store = getStore();
  const preorder = await store.getPreorderBySession(args.sessionId);
  const target = preorder ?? null;
  if (!target || target.id !== preorderId || target.status === "paid") return;
  await store.updatePreorder(target.id, { status: "paid", stripePaymentIntentId: args.paymentIntentId });
  if (target.orderId) {
    const order = await store.getOrder(target.orderId);
    const keepUntil = "2026-11-15T00:00:00.000Z";
    if (order && !order.uploadsDeletedAt && (!order.photosDeleteAfter || order.photosDeleteAfter < keepUntil)) {
      await store.updateOrder(order.id, { photosDeleteAfter: keepUntil });
    }
  }
  await sendEmail(
    withEmailDelivery(
      { stripeLivemode: args.stripeLivemode ?? false, requestHost: null },
      {
        to: target.email,
        subject: `Christmas pre-order confirmed — ${APP_NAME}`,
        html: christmasEmail(),
        storeId: target.storeId,
      },
    ),
  );
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status === "unpaid") return;
  const { persistCheckoutSessionLivemode } = await import("@/lib/stripe/livemode");
  await persistCheckoutSessionLivemode(session);
  const kind = session.metadata?.kind;
  const args: PaidArgs = {
    sessionId: session.id,
    paymentIntentId: paymentIntentId(session),
    amountPence: session.amount_total,
    stripeLivemode: session.livemode,
  };
  if ((kind === "portrait" || kind === "season_pass") && session.metadata?.orderId) {
    const orderId = session.metadata.orderId;
    const portraitOrder = await getStore().getOrder(orderId);
    if (portraitOrder?.storeId === "jinglefold" && portraitOrder.productMeta?.personalised) {
      const shipping = shippingFrom(session);
      if (shipping) await getStore().updateOrder(orderId, { shipping });
    }
    await markPortraitPaid(orderId, args);
    if (kind === "season_pass") {
      const subscription = session.subscription;
      const stripeSubscriptionId = typeof subscription === "string" ? subscription : subscription?.id ?? null;
      await getStore().updateOrder(session.metadata.orderId, { stripeSubscriptionId, subscriptionStatus: "active" });
    }
  }
  if (kind === "extra_styles" && session.metadata?.orderId) {
    await markExtraPaid(session.metadata.orderId, (session.metadata.styleIds || "").split(",").filter(Boolean), args);
  }
  if (kind === "print" && session.metadata?.printId) await markPrintPaid(session.metadata.printId, session, args);
  if (kind === "christmas" && session.metadata?.preorderId) await markChristmasPaid(session.metadata.preorderId, args);
  if (kind === "shop" && session.metadata?.shopOrderId) {
    const { markShopOrderPaid } = await import("@/lib/shop/fulfillment");
    await markShopOrderPaid(session.metadata.shopOrderId, session);
  }
  const storeId = session.metadata?.storeId;
  if (storeId && kind) {
    const { recordPaidAnalyticsEvent } = await import("@/lib/analytics/server-events");
    await recordPaidAnalyticsEvent({
      storeId,
      kind,
      orderId: session.metadata?.orderId ?? session.metadata?.shopOrderId,
      visitorSessionId: session.metadata?.visitorSessionId,
      amountPence: session.amount_total,
    });
  }
}

export async function noteFailedPayment(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId || (session.metadata?.kind !== "portrait" && session.metadata?.kind !== "season_pass")) return;
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status !== "pending_payment") return;
  await store.updateOrder(order.id, { failureReason: "The payment was not completed." });
}

export async function noteSeasonRenewed(subscriptionId: string) {
  const store = getStore();
  const order = await store.getOrderBySubscription(subscriptionId);
  if (!order || order.subscriptionStatus === "canceled") return;
  await sendEmail(
    withEmailDelivery(orderEmailDelivery(order), {
      to: order.email,
      subject: `Your ${APP_NAME} season pass renewed`,
      html: "<p>The next season’s family portraits will use the photos we already hold. We’ll email the gallery when that season opens.</p>",
      storeId: order.storeId,
    }),
  );
  await alertAdmin(
    "Season pass renewed",
    `<p>${order.email} renewed ${subscriptionId}. The next season is not generated automatically.</p>`,
    order.storeId,
  );
}

export async function noteSeasonCanceled(subscriptionId: string) {
  const store = getStore();
  const order = await store.getOrderBySubscription(subscriptionId);
  if (!order) return;
  await store.updateOrder(order.id, { subscriptionStatus: "canceled" });
  await alertAdmin(
    "Season pass canceled",
    `<p>${order.email} canceled ${subscriptionId}.</p>`,
    order.storeId,
  );
}

export class OrderAlreadyRefundedError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} is already refunded.`);
    this.name = "OrderAlreadyRefundedError";
  }
}

/** Stripe answers this when the charge behind a payment intent was already fully refunded. */
function isAlreadyRefundedStripeError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "charge_already_refunded";
}

export async function refundOrder(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status === "refunded") throw new OrderAlreadyRefundedError(orderId);
  const stripe = getStripeForStore(order.storeId, { stripeLivemode: order.stripeLivemode });
  const prints = await store.listPrints(orderId);
  const intents = new Set<string>();
  for (const payment of order.payments) {
    if (payment.paymentIntentId) intents.add(payment.paymentIntentId);
  }
  for (const print of prints) {
    if (print.stripePaymentIntentId) intents.add(print.stripePaymentIntentId);
  }
  if (order.stripePaymentIntentId) intents.add(order.stripePaymentIntentId);
  if (stripe) {
    for (const intent of intents) {
      if (intent.startsWith("demo")) continue;
      try {
        await stripe.refunds.create({ payment_intent: intent });
      } catch (error) {
        // Refunded already (e.g. from the Stripe dashboard): record it rather than failing.
        if (!isAlreadyRefundedStripeError(error)) throw error;
      }
    }
  }
  await store.updateOrder(orderId, { status: "refunded" });
}
