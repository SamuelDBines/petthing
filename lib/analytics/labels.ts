import type { FunnelStep } from "@/lib/analytics/types";

const FUNNEL_LABELS: Record<FunnelStep, string> = {
  landing: "Landing",
  photo_upload: "Photo uploaded",
  preview_generated: "Preview generated",
  checkout_started: "Checkout started",
  paid: "Paid",
  upsell_add: "Upsell added",
};

export function funnelStepLabel(step: FunnelStep | string) {
  return FUNNEL_LABELS[step as FunnelStep] ?? step.replaceAll("_", " ");
}

export const BOUNCE_RATE_TOOLTIP =
  "Bounce rate: a single-page session with no interaction event within 10 seconds. Interaction means a funnel step beyond landing (upload, preview, checkout, etc.).";
