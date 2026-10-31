import { notFound } from "next/navigation";
import { CheckoutSuccessView } from "@/components/checkout-success-view";
import { demoCheckoutSuccessPayload } from "@/lib/checkout/build-success-status";
import type { CheckoutSuccessPhase } from "@/lib/checkout/success-types";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/brand";

const PHASES: CheckoutSuccessPhase[] = [
  "confirming",
  "generating",
  "ready",
  "review",
  "failed",
  "refunded",
  "expired_unpaid",
  "christmas_booked",
];

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.ALLOW_CHECKOUT_SUCCESS_PREVIEW !== "1" && process.env.NODE_ENV === "production") notFound();
  const { state } = await searchParams;
  const phase = (PHASES.includes(state as CheckoutSuccessPhase) ? state : "generating") as CheckoutSuccessPhase;
  const payload = demoCheckoutSuccessPayload(phase);
  return (
    <CheckoutSuccessView
      payload={payload}
      brand={{ appName: APP_NAME, supportEmail: SUPPORT_EMAIL, ordersEmail: "orders@pawtraitry.com" }}
    />
  );
}
