import { GREETING_CARD_PRINT_ID, getPrint, type PrintProductId } from "@/config/prints";
import { discountedPence, formatGbp, getTier, PRIORITY_PENCE, type Tier, type TierId } from "@/config/pricing";
import type Stripe from "stripe";

export type { PawtraitryCreateProductOffer } from "@/lib/pawtraitry/create-basket-offers";
export {
  guaranteedPortraitDimensions,
  pawtraitryCreateProductOffers,
  productAvailableForTier,
  tierDetailBullets,
} from "@/lib/pawtraitry/create-basket-offers";

export type PawtraitryPhysicalBasketLine = {
  productId: PrintProductId;
  quantity: number;
};

export type PawtraitryCheckoutBasket = {
  physical: PawtraitryPhysicalBasketLine[];
};

export function normalizePhysicalBasket(lines: PawtraitryPhysicalBasketLine[]) {
  const merged = new Map<PrintProductId, number>();
  for (const line of lines) {
    if (line.quantity < 1) continue;
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export function physicalBasketSubtotalPence(lines: PawtraitryPhysicalBasketLine[]) {
  return normalizePhysicalBasket(lines).reduce(
    (sum, line) => sum + getPrint(line.productId).pricePence * line.quantity,
    0,
  );
}

export function pawtraitryBasketHasPhysical(basket: PawtraitryCheckoutBasket | null | undefined) {
  return Boolean(basket?.physical?.some((line) => line.quantity > 0));
}

export function orderAmountPence(args: {
  tier: Tier;
  offer: "one_off" | "season_pass";
  seasonPassPence: number;
  priority: boolean;
  referralDiscountPence: number;
  physical: PawtraitryPhysicalBasketLine[];
}) {
  const base =
    args.offer === "season_pass"
      ? args.seasonPassPence
      : discountedPence(args.tier.pricePence, args.referralDiscountPence);
  const physical = args.offer === "season_pass" ? 0 : physicalBasketSubtotalPence(args.physical);
  const priority = args.offer === "season_pass" ? 0 : args.priority ? PRIORITY_PENCE : 0;
  return base + physical + priority;
}

/** UK delivery is included in Pawtraitry print prices (no extra Stripe shipping line). */
export function pawtraitryBasketShippingPence(_lines: PawtraitryPhysicalBasketLine[]) {
  return 0;
}

export function pawtraitryBasketSummary(args: {
  tier: Tier;
  tierId: TierId;
  offer: "one_off" | "season_pass";
  seasonPassPence: number;
  seasonPassName: string;
  priority: boolean;
  referralDiscountPence: number;
  physical: PawtraitryPhysicalBasketLine[];
}) {
  const digitalPence =
    args.offer === "season_pass"
      ? args.seasonPassPence
      : discountedPence(args.tier.pricePence, args.referralDiscountPence);
  const physicalPence = args.offer === "season_pass" ? 0 : physicalBasketSubtotalPence(args.physical);
  const priorityPence = args.offer === "season_pass" ? 0 : args.priority ? PRIORITY_PENCE : 0;
  const shippingPence = pawtraitryBasketShippingPence(args.physical);
  const lines: { label: string; amountPence: number; quantity?: number }[] = [];
  if (args.offer === "season_pass") {
    lines.push({ label: args.seasonPassName, amountPence: digitalPence, quantity: 1 });
  } else {
    lines.push({ label: `${args.tier.name} digital pack`, amountPence: digitalPence, quantity: 1 });
    for (const row of normalizePhysicalBasket(args.physical)) {
      const product = getPrint(row.productId);
      lines.push({
        label: product.name,
        amountPence: product.pricePence * row.quantity,
        quantity: row.quantity,
      });
    }
    if (priorityPence) lines.push({ label: "Priority delivery", amountPence: priorityPence, quantity: 1 });
  }
  const subtotalPence = digitalPence + physicalPence + priorityPence;
  return {
    lines,
    subtotalPence,
    shippingPence,
    totalPence: subtotalPence + shippingPence,
    shippingLabel: pawtraitryBasketHasPhysical({ physical: args.physical })
      ? "UK delivery included in print prices"
      : "Digital delivery by email",
  };
}

export function stripeLineItemsForPortraitCheckout(args: {
  brandName: string;
  tier: Tier;
  offer: "one_off" | "season_pass";
  seasonPassPence: number;
  seasonPassName: string;
  priority: boolean;
  physical: PawtraitryPhysicalBasketLine[];
  referralDiscountPence?: number;
}): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const line = (name: string, amount: number, quantity = 1, yearly = false) =>
    ({
      quantity,
      price_data: {
        currency: "gbp",
        unit_amount: amount,
        product_data: { name },
        ...(yearly ? { recurring: { interval: "year" as const } } : {}),
      },
    }) satisfies Stripe.Checkout.SessionCreateParams.LineItem;

  if (args.offer === "season_pass") {
    items.push(line(`${args.brandName} season pass`, args.seasonPassPence, 1, true));
    return items;
  }
  items.push(line(`${args.brandName} · ${args.tier.name}`, discountedPence(args.tier.pricePence, args.referralDiscountPence ?? 0), 1));
  for (const row of normalizePhysicalBasket(args.physical)) {
    const product = getPrint(row.productId);
    items.push(line(`${args.brandName} · ${product.name}`, product.pricePence, row.quantity));
  }
  if (args.priority) items.push(line("Priority delivery", PRIORITY_PENCE, 1));
  return items;
}

export function basketLineLabels(basket: PawtraitryCheckoutBasket | null | undefined) {
  if (!basket?.physical?.length) return [];
  return normalizePhysicalBasket(basket.physical).map((row) => {
    const product = getPrint(row.productId);
    return row.quantity > 1 ? `${product.name} × ${row.quantity}` : product.name;
  });
}

export function greetingCardIncludedInTier(tierId: TierId) {
  return getTier(tierId).includesCard;
}

export { GREETING_CARD_PRINT_ID, formatGbp };
