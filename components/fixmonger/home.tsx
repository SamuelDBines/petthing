"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { formatGbp } from "@/config/pricing";
import { FIXMONGER_DELIVERY } from "@/config/catalogue/pricing-seed";
import {
  EmailCapture,
  ReviewsPlaceholder,
  ShopFaq,
  TrustRow,
} from "@/components/shop/marketing-sections";
import { ProductCard } from "@/components/shop/product-card";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";

const FAQ: [string, string][] = [
  ["Where do you ship from?", "Ready-made items ship from our UK dropship partner — typically 3–5 working days."],
  ["When is delivery free?", `Free UK delivery on orders over ${formatGbp(FIXMONGER_DELIVERY.freeDeliveryOverPence)}.`],
  ["Can I return something?", "Unused items in original packaging — see Returns & refunds for details."],
  ["Are bundle savings real?", "Compare-at prices are the sum of parts — no invented was prices."],
];

const SECTIONS: { id: string; title: string; blurb: string; categories: string[] }[] = [
  { id: "door", title: "Door & draughts", blurb: "Magnetic thermal curtains that close behind you.", categories: ["door"] },
  { id: "car", title: "Car", blurb: "Frost covers, brushes, and the sensible boot kit.", categories: ["car"] },
  { id: "garden", title: "Garden", blurb: "Fleece and jackets before the first hard frost.", categories: ["garden"] },
  { id: "kits", title: "Kits with real savings", blurb: "Bundles priced honestly against buying separately.", categories: ["bundles"] },
];

export function FixmongerHome({ products }: { products: StorefrontCatalogueProduct[] }) {
  const bundles = useMemo(() => products.filter((p) => p.kind === "bundle"), [products]);

  return (
    <main data-testid="fixmonger-home">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-pumpkin">Fixmonger</p>
          <h1 className="mt-3 display text-4xl leading-tight text-cream sm:text-5xl">Cheap fixes for proper British weather.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Frost covers, draught curtains, and shed essentials — no electric, no nonsense. Free UK delivery over{" "}
            {formatGbp(FIXMONGER_DELIVERY.freeDeliveryOverPence)}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#door" className="min-h-12 rounded-full bg-pumpkin px-6 text-sm font-semibold text-white inline-flex items-center">
              Shop door fixes
            </Link>
            <Link href="#kits" className="min-h-12 rounded-full border border-line px-6 text-sm font-medium text-cream inline-flex items-center">
              View kits
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line shadow-lg">
          <Image
            src="/stores/fixmonger/hero.jpg"
            alt="Fixmonger winter essentials laid out on a workbench"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
            priority
            sizes="(max-width:768px) 100vw, 50vw"
          />
        </div>
      </section>

      <TrustRow />

      {SECTIONS.map((section) => {
        const items = products.filter((p) => section.categories.includes(p.category));
        if (!items.length) return null;
        return (
          <section key={section.id} id={section.id} className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="display text-3xl text-cream">{section.title}</h2>
            <p className="mt-2 text-muted">{section.blurb}</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="fixmonger-product-grid">
              {items.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        );
      })}

      {bundles.length ? null : null}

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="display text-2xl text-cream">Around the house</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.filter((p) => p.category === "home").map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <ReviewsPlaceholder />
      <ShopFaq items={FAQ} />
      <EmailCapture storeName="Fixmonger" />
    </main>
  );
}
