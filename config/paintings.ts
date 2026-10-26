import type { Tier } from "@/config/pricing";

/** Painted-style AI presets (Pawtraitry canvas range). */
export const PAINTED_STYLE_IDS = ["oil-painting", "watercolour", "charcoal-sketch"] as const;
export type PaintedStyleId = (typeof PAINTED_STYLE_IDS)[number];

export const HAND_PAINTED_TIERS: Tier[] = [
  {
    id: "hand_painted_12x16",
    name: "Hand-painted 12×16″",
    pricePence: 22900,
    styleCount: 1,
    imageCount: 1,
    quality: "hd",
    includesCard: false,
    popular: false,
    blurb: "A real artist paints your pet from your photos — not AI.",
    points: ["12×16 inch canvas", "Artist proof for your approval", "10–27 business days"],
  },
  {
    id: "hand_painted_16x20",
    name: "Hand-painted 16×20″",
    pricePence: 27900,
    styleCount: 1,
    imageCount: 1,
    quality: "hd",
    includesCard: false,
    popular: false,
    blurb: "Larger studio piece with proof approval before shipping.",
    points: ["16×20 inch canvas", "Artist proof for your approval", "10–27 business days"],
  },
];

export function isHandPaintedTierId(tierId: string) {
  return tierId === "hand_painted_12x16" || tierId === "hand_painted_16x20";
}

export type PaintingCutoffs = {
  handPaintedIso: string;
  canvasIso: string;
};

export const DEFAULT_PAINTING_CUTOFFS: PaintingCutoffs = {
  handPaintedIso: "2026-11-13T23:59:00.000Z",
  canvasIso: "2026-12-14T23:59:00.000Z",
};

export const HAND_PAINTED_DELIVERY_DAYS = { min: 10, max: 27 };

export const DEFAULT_DUTIES_DISCLAIMER =
  "Your order may ship from abroad. Import duties and taxes are not included unless we confirm duties-paid delivery for your country.";

export type HandPaintedStatus =
  | "awaiting_admin"
  | "sent_to_artist"
  | "proof_received"
  | "proof_sent_to_customer"
  | "proof_approved"
  | "shipped"
  | "delivered";

export const HAND_PAINTED_STATUS_LABELS: Record<HandPaintedStatus, string> = {
  awaiting_admin: "Paid — draft email ready",
  sent_to_artist: "Sent to artist",
  proof_received: "Proof received",
  proof_sent_to_customer: "Awaiting customer proof approval",
  proof_approved: "Proof approved",
  shipped: "Shipped",
  delivered: "Delivered",
};
