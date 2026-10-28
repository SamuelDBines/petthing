import { PRINTS } from "@/config/prints";
import { getTier } from "@/config/pricing";
import { getTheme } from "@/config/themes";
import {
  checkoutSuccessAllowsPurchaseEvent,
  friendlyOrderRef,
  mapCheckoutSuccessPhase,
} from "@/lib/checkout/success-view";
import type { CheckoutSuccessPayload } from "@/lib/checkout/success-types";
import { signedBlobUrl } from "@/lib/blobs";
import { portraitGenerationProgress } from "@/lib/generation/progress";
import { getStripeForStore } from "@/lib/stripe";
import type { Order } from "@/lib/domain";
import { loadStoreConfig } from "@/lib/tenant/context";
import { getStore } from "@/lib/store";

async function stripeSessionHints(
  sessionId: string,
  storeId: string,
  stripeLivemode?: boolean | null,
): Promise<{ paymentStatus: string | null; sessionStatus: string | null } | null> {
  if (sessionId.startsWith("demo_")) return null;
  const stripe = getStripeForStore(storeId, { stripeLivemode: stripeLivemode ?? false });
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { paymentStatus: session.payment_status ?? null, sessionStatus: session.status ?? null };
  } catch {
    return null;
  }
}

async function portraitPayload(args: {
  order: Order;
  sessionId: string;
  mediaOrigin: string;
}): Promise<CheckoutSuccessPayload> {
  const store = getStore();
  const config = await loadStoreConfig(args.order.storeId);
  const tier = getTier(args.order.tierId, config.catalog.tiers);
  const theme =
    config.themes?.find((item) => item.id === args.order.themeId) ?? getTheme(args.order.themeId);
  const styleNames =
    theme?.styles.filter((s) => args.order.styleIds.includes(s.id)).map((s) => s.name) ?? [];
  const assets = await store.listAssets(args.order.id);
  const upload = assets.find((a) => a.kind === "upload");
  const uploadThumbnailUrl = upload
    ? await signedBlobUrl(upload.bucket, upload.storagePath, 60 * 60, false, args.mediaOrigin)
    : null;
  const hints = await stripeSessionHints(
    args.sessionId,
    args.order.storeId,
    args.order.stripeLivemode,
  );
  const phase = mapCheckoutSuccessPhase({
    kind: "portrait",
    status: args.order.status,
    stripePaymentStatus: hints?.paymentStatus,
    stripeSessionStatus: hints?.sessionStatus,
  });
  let progress: CheckoutSuccessPayload["progress"] = null;
  if (phase === "generating" || phase === "review") {
    const jobs = await store.listJobs(args.order.id);
    const p = portraitGenerationProgress(tier, jobs, assets);
    progress = { expected: p.expected, generated: p.generated };
  }
  return {
    kind: "portrait",
    phase,
    orderRef: friendlyOrderRef(args.order.id),
    email: args.order.email,
    packageName: tier.name,
    styleNames,
    imageCount: tier.imageCount,
    uploadThumbnailUrl,
    amountPence: args.order.amountPence,
    orderedAt: args.order.createdAt,
    resultsPath: args.order.status === "delivered" ? `/results/${args.order.resultsToken}` : null,
    progress,
    failureReason: args.order.failureReason,
    trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase),
  };
}

export async function buildCheckoutSuccessStatus(args: {
  sessionId: string;
  storeId: string;
  mediaOrigin: string;
}): Promise<CheckoutSuccessPayload> {
  const store = getStore();
  const order = await store.getOrderByCheckoutSession(args.sessionId);
  if (order) {
    return portraitPayload({ order, sessionId: args.sessionId, mediaOrigin: args.mediaOrigin });
  }

  const print = await store.getPrintBySession(args.sessionId);
  if (print) {
    const parent = await store.getOrder(print.orderId);
    const hints = await stripeSessionHints(
      args.sessionId,
      parent?.storeId ?? args.storeId,
      parent?.stripeLivemode,
    );
    const phase = mapCheckoutSuccessPhase({
      kind: "print",
      status: print.status,
      stripePaymentStatus: hints?.paymentStatus,
      stripeSessionStatus: hints?.sessionStatus,
    });
    const product = PRINTS.find((item) => item.id === print.productId);
    return {
      kind: "print",
      phase,
      orderRef: friendlyOrderRef(print.id),
      email: parent?.email ?? null,
      packageName: product?.name ?? "Print",
      styleNames: [],
      imageCount: null,
      uploadThumbnailUrl: null,
      amountPence: product?.pricePence ?? null,
      orderedAt: print.createdAt,
      resultsPath: parent ? `/results/${parent.resultsToken}` : null,
      progress: null,
      failureReason: print.error,
      trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase),
    };
  }

  const preorder = await store.getPreorderBySession(args.sessionId);
  if (preorder) {
    const hints = await stripeSessionHints(args.sessionId, preorder.storeId, false);
    const phase = mapCheckoutSuccessPhase({
      kind: "christmas",
      status: preorder.status,
      stripePaymentStatus: hints?.paymentStatus,
      stripeSessionStatus: hints?.sessionStatus,
    });
    return {
      kind: "christmas",
      phase,
      orderRef: friendlyOrderRef(preorder.id),
      email: preorder.email,
      packageName: "Christmas pre-order",
      styleNames: [],
      imageCount: null,
      uploadThumbnailUrl: null,
      amountPence: preorder.amountPence,
      orderedAt: preorder.createdAt,
      resultsPath: null,
      progress: null,
      failureReason: null,
      trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase),
    };
  }

  const hints = await stripeSessionHints(args.sessionId, args.storeId, false);
  const phase = mapCheckoutSuccessPhase({
    kind: "unknown",
    status: "confirming",
    stripePaymentStatus: hints?.paymentStatus,
    stripeSessionStatus: hints?.sessionStatus,
  });
  return {
    kind: "unknown",
    phase,
    orderRef: null,
    email: null,
    packageName: null,
    styleNames: [],
    imageCount: null,
    uploadThumbnailUrl: null,
    amountPence: null,
    orderedAt: null,
    resultsPath: null,
    progress: null,
    failureReason: null,
    trackPurchase: false,
  };
}

/** Demo payloads for preview/screenshots (no session lookup). */
export function demoCheckoutSuccessPayload(phase: CheckoutSuccessPayload["phase"]): CheckoutSuccessPayload {
  const base: CheckoutSuccessPayload = {
    kind: "portrait",
    phase,
    orderRef: "A1B2C3D4",
    email: "you@example.com",
    packageName: "Mini",
    styleNames: ["Victorian portrait", "Cosy classic"],
    imageCount: 2,
    uploadThumbnailUrl: "/examples/pet-before.jpg",
    amountPence: 999,
    orderedAt: "2026-10-28T12:00:00.000Z",
    resultsPath: phase === "ready" ? "/results/demo-token" : null,
    progress: phase === "generating" ? { expected: 2, generated: 1 } : null,
    failureReason: phase === "failed" ? "A portrait failed after three attempts." : null,
    trackPurchase: checkoutSuccessAllowsPurchaseEvent(phase),
  };
  if (phase === "christmas_booked") return { ...base, kind: "christmas", packageName: "Christmas pre-order" };
  if (phase === "print_processing") return { ...base, kind: "print", packageName: "252-piece puzzle" };
  if (phase === "refunded") return { ...base, trackPurchase: false };
  if (phase === "expired_unpaid") return { ...base, trackPurchase: false, amountPence: null };
  if (phase === "confirming") return { ...base, trackPurchase: false, progress: null };
  return base;
}
