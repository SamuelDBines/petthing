"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { classicFramedProductId } from "@/config/pawtraitryPhysicalPrints";
import { PAWTRAITRY_PRODUCT_MOCKUP_SIZE } from "@/config/pawtraitry-product-mockups";
import { formatGbp, SEASON_PASS, TIERS, type Tier, type TierId } from "@/config/pricing";
import type { StyleDefinition } from "@/config/themes";
import type { PrintProductId } from "@/config/prints";
import {
  pawtraitryBasketSummary,
  tierDetailBullets,
  type PawtraitryPhysicalBasketLine,
} from "@/lib/pawtraitry/create-basket";
import { pawtraitryCreateProductOffers } from "@/lib/pawtraitry/create-basket-offers";

type Props = {
  tierId: TierId;
  onTierId: (id: TierId) => void;
  physical: PawtraitryPhysicalBasketLine[];
  onPhysical: (lines: PawtraitryPhysicalBasketLine[]) => void;
  priority: boolean;
  onPriority: (value: boolean) => void;
  styleCount: number;
  requiredStyles: number;
  onBack: () => void;
  onContinue: () => void;
};

function qtyFor(lines: PawtraitryPhysicalBasketLine[], productId: PrintProductId) {
  return lines.find((l) => l.productId === productId)?.quantity ?? 0;
}

function setQty(lines: PawtraitryPhysicalBasketLine[], productId: PrintProductId, quantity: number) {
  const next = lines.filter((l) => l.productId !== productId);
  if (quantity > 0) next.push({ productId, quantity });
  return next;
}

export function PawtraitryCreateBasketStep({
  tierId,
  onTierId,
  physical,
  onPhysical,
  priority,
  onPriority,
  styleCount,
  requiredStyles,
  onBack,
  onContinue,
}: Props) {
  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[1]!;
  const offers = useMemo(() => pawtraitryCreateProductOffers(tier), [tier]);
  const [framedSize, setFramedSize] = useState(offers.find((o) => o.id === "classic_framed")?.framed?.sizeKey ?? "a3");
  const [framedColor, setFramedColor] = useState(offers.find((o) => o.id === "classic_framed")?.framed?.colorId ?? "black");

  const summary = pawtraitryBasketSummary({
    tier,
    tierId,
    offer: "one_off",
    seasonPassPence: SEASON_PASS.pricePence,
    seasonPassName: SEASON_PASS.name,
    priority,
    referralDiscountPence: 0,
    physical,
  });

  const stylesOk = styleCount === requiredStyles || tier.styleCount === "all";

  function framedProductId() {
    return classicFramedProductId(framedSize, framedColor);
  }

  function changeFramedQty(delta: number) {
    const id = framedProductId();
    if (!id) return;
    const current = qtyFor(physical, id);
    onPhysical(setQty(physical, id, Math.max(0, Math.min(10, current + delta))));
  }

  return (
    <section className="mt-6 pb-36">
      <p className="text-cream/75">
        Choose your digital pack (required). Add mugs, prints, and gifts in the same checkout. Physical items are printed from your best
        finished portrait for this order. UK delivery is included in each print price.
      </p>
      {!stylesOk ? (
        <p className="mt-3 rounded-2xl border border-gold/40 p-3 text-sm">Pick {requiredStyles} style{requiredStyles === 1 ? "" : "s"} on the previous step for {tier.name}.</p>
      ) : null}

      <h2 className="mt-8 text-2xl">Digital packs</h2>
      <div className="mt-4 grid gap-3">
        {TIERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTierId(item.id)}
            className={`rounded-3xl border p-4 text-left ${tierId === item.id ? "border-pumpkin" : "border-line"}`}
          >
            <span className="flex justify-between gap-3">
              <span className="text-lg font-medium">
                {item.name}
                {item.popular ? " · most popular" : ""}
              </span>
              <span>{formatGbp(item.pricePence)}</span>
            </span>
            <p className="mt-2 text-sm text-cream/70">{item.blurb}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-muted">
              {tierDetailBullets(item).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <h2 className="mt-10 text-2xl">Prints and gifts</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {offers.map((offer) => {
          if (offer.id === "classic_framed" && offer.framed) {
            const productId = framedProductId();
            const q = productId ? qtyFor(physical, productId) : 0;
            return (
              <li key="classic_framed" className="rounded-2xl border border-line bg-bark p-3">
                {offer.previewImage ? (
                  <Image
                    src={offer.previewImage}
                    alt={offer.previewAlt ?? offer.name}
                    width={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.width}
                    height={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.height}
                    className="aspect-square w-full rounded-xl object-cover"
                    sizes="(max-width:640px) 100vw, 50vw"
                    loading="lazy"
                  />
                ) : null}
                <p className="mt-2 font-medium">{offer.name}</p>
                <p className="text-sm text-muted">{offer.fromPrice ? `from ${formatGbp(offer.pricePence)}` : formatGbp(offer.pricePence)}</p>
                <p className="mt-1 text-sm text-cream/70">{offer.detail}</p>
                <label className="mt-3 block text-xs text-muted">
                  Size
                  <select className="field mt-1 w-full" value={framedSize} onChange={(e) => setFramedSize(e.target.value)}>
                    {offer.framed.sizes.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label} · {formatGbp(s.fromPence)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 block text-xs text-muted">
                  Frame colour
                  <select className="field mt-1 w-full" value={framedColor} onChange={(e) => setFramedColor(e.target.value)}>
                    {offer.framed.colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-9 w-9 rounded-full border border-line" onClick={() => changeFramedQty(-1)} aria-label="Decrease">
                      −
                    </button>
                    <span className="min-w-6 text-center">{q}</span>
                    <button type="button" className="h-9 w-9 rounded-full border border-line" onClick={() => changeFramedQty(1)} aria-label="Increase">
                      +
                    </button>
                  </div>
                </div>
              </li>
            );
          }
          const productId = offer.id as PrintProductId;
          const q = qtyFor(physical, productId);
          return (
            <li key={offer.id} className="rounded-2xl border border-line bg-bark p-3">
              {offer.previewImage ? (
                <Image
                  src={offer.previewImage}
                  alt={offer.previewAlt ?? offer.name}
                  width={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.width}
                  height={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.height}
                  className="aspect-square w-full rounded-xl object-cover"
                  sizes="(max-width:640px) 100vw, 50vw"
                  loading="lazy"
                />
              ) : null}
              <p className="mt-2 font-medium">{offer.name}</p>
              <p className="text-sm text-muted">{formatGbp(offer.pricePence)}</p>
              <p className="mt-1 text-sm text-cream/70">{offer.detail}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full border border-line"
                    onClick={() => onPhysical(setQty(physical, productId, Math.max(0, q - 1)))}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center">{q}</span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full border border-line"
                    onClick={() => onPhysical(setQty(physical, productId, Math.min(10, q + 1)))}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <label className="mt-6 flex gap-3 text-sm leading-6">
        <input type="checkbox" checked={priority} onChange={(e) => onPriority(e.target.checked)} />
        Priority on your digital portraits, under 2 hours target, {formatGbp(299)}
      </label>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          <ul className="max-h-24 overflow-y-auto text-sm">
            {summary.lines.map((row) => (
              <li key={row.label} className="flex justify-between gap-2">
                <span className="truncate">{row.quantity && row.quantity > 1 ? `${row.label} × ${row.quantity}` : row.label}</span>
                <span className="shrink-0">{formatGbp(row.amountPence)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm text-muted">
            <span>{summary.shippingLabel}</span>
            <span>{summary.shippingPence === 0 ? formatGbp(0) : formatGbp(summary.shippingPence)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold">Total {formatGbp(summary.totalPence)}</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={onBack}>
                Back
              </button>
              <button
                type="button"
                className="rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                onClick={onContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
