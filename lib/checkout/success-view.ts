import type { CheckoutSuccessKind, CheckoutSuccessPhase } from "@/lib/checkout/success-types";

export function friendlyOrderRef(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export type PhaseInput = {
  kind: CheckoutSuccessKind;
  status: string;
  stripePaymentStatus?: string | null;
  stripeSessionStatus?: string | null;
};

export function mapCheckoutSuccessPhase(input: PhaseInput): CheckoutSuccessPhase {
  const { kind, status } = input;
  const payment = input.stripePaymentStatus?.trim() || null;
  const session = input.stripeSessionStatus?.trim() || null;

  if (kind === "christmas") {
    if (status === "paid") return "christmas_booked";
    if (payment === "unpaid" && session === "expired") return "expired_unpaid";
    if (status === "pending_payment" && payment === "unpaid") return "expired_unpaid";
    return "confirming";
  }

  if (kind === "print") {
    if (status === "failed") return "failed";
    if (status === "pending_payment") {
      if (payment === "paid") return "confirming";
      if (payment === "unpaid" && session === "expired") return "expired_unpaid";
      if (payment === "unpaid") return "expired_unpaid";
      return "confirming";
    }
    return "print_processing";
  }

  if (kind === "unknown") {
    if (payment === "unpaid" && session === "expired") return "expired_unpaid";
    if (payment === "unpaid") return "expired_unpaid";
    return "confirming";
  }

  // portrait order
  if (status === "refunded") return "refunded";
  if (status === "failed") return "failed";
  if (status === "delivered") return "ready";
  if (status === "review") return "review";
  if (status === "generating" || status === "paid" || status === "waiting_for_credit") return "generating";
  if (status === "pending_payment") {
    if (payment === "paid") return "confirming";
    if (payment === "unpaid" && session === "expired") return "expired_unpaid";
    if (payment === "unpaid") return "expired_unpaid";
    return "confirming";
  }
  return "confirming";
}

export function checkoutSuccessAllowsPurchaseEvent(phase: CheckoutSuccessPhase): boolean {
  return (
    phase === "generating" ||
    phase === "ready" ||
    phase === "review" ||
    phase === "christmas_booked" ||
    phase === "print_processing"
  );
}

export type SuccessCopy = {
  title: string;
  lead: string;
};

export function checkoutSuccessCopy(phase: CheckoutSuccessPhase, kind: CheckoutSuccessKind): SuccessCopy {
  switch (phase) {
    case "confirming":
      return {
        title: "Confirming your payment",
        lead: "Stripe is finishing up. This usually takes a few seconds. We'll refresh automatically.",
      };
    case "generating":
      return {
        title: "Payment received: portraits in progress",
        lead: "Your portraits are queued and will be ready soon. Most orders finish within a few minutes, then we email your private gallery link.",
      };
    case "ready":
      return {
        title: "Your gallery is ready",
        lead: "Open your private link below. We've also emailed it. Check spam and add orders@pawtraitry.com to your contacts.",
      };
    case "review":
      return {
        title: "We're giving your portraits a final look",
        lead: "An artist is reviewing the set before we send your gallery email. You don't need to do anything.",
      };
    case "failed":
      return {
        title: "Something went wrong",
        lead: "We couldn't finish your portraits. Reply to your confirmation email or contact us. We'll regenerate or refund.",
      };
    case "refunded":
      return {
        title: "This order was refunded",
        lead: "Your payment has been returned. If you still want portraits, you can start a fresh order anytime.",
      };
    case "expired_unpaid":
      return {
        title: "Checkout wasn't completed",
        lead: "This session expired or payment didn't go through. You can return to create and try again. You won't be charged twice for an unfinished checkout.",
      };
    case "christmas_booked":
      return {
        title: "Christmas is booked",
        lead: kind === "christmas"
          ? "We’ll email you on 1 November when it’s time to confirm photos and styles."
          : "Your Christmas pre-order is paid.",
      };
    case "print_processing":
      return {
        title: "Print order received",
        lead: "Your puzzle is with our UK print partner. We'll email when it's dispatched.",
      };
    default:
      return { title: "Thanks for your order", lead: "" };
  }
}

export function showCheckoutUpsells(phase: CheckoutSuccessPhase) {
  return phase === "generating" || phase === "ready";
}
