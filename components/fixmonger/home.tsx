"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  EmailCapture,
  ReviewsPlaceholder,
  ShopFaq,
  TrustRow,
} from "@/components/shop/marketing-sections";
import { ProductCard } from "@/components/shop/product-card";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";

const FAQ: [string, string][] = [
  [
    "Can I leave windows open with pets inside?",
    "Our cut-to-fit polyester mesh helps keep insects out while you ventilate. It is not cat-proof or claw-proof. Our Cat-safe windows range is coming soon as an own-brand, pet-grade option.",
  ],
  ["Where do you ship from?", "Go Dropship UK. Free delivery, typically 3–5 working days."],
  ["Is the mesh pet-safe?", "We never claim polyester fly mesh is claw-proof. Use it for insects and ventilation, not as a pet barrier."],
  ["Can I return something?", "Unused items in original packaging. See Returns & refunds."],
];

const SECTIONS: { id: string; title: string; blurb: string; categories: string[] }[] = [
  {
    id: "catsafe",
    title: "Cat-safe windows",
    blurb: "Own-brand, pet-grade screens. Sourcing now. Join the list below for launch news.",
    categories: [],
  },
  {
    id: "window",
    title: "Insect & spider screens",
    blurb: "Cut-to-fit window mesh so you can ventilate without inviting everything that flies.",
    categories: ["window", "screen"],
  },
  {
    id: "door",
    title: "Door curtains",
    blurb: "Magnetic thermal curtains and walk-through fly screens for busy doorways.",
    categories: ["door"],
  },
  {
    id: "draught",
    title: "Thermal & draught",
    blurb: "Layer thermal curtains with seal strips to keep heat in.",
    categories: ["draught"],
  },
  {
    id: "kits",
    title: "Door kits",
    blurb: "Thermal plus mesh for the same doorway. Priced as a pair.",
    categories: ["bundles"],
  },
];

export function FixmongerHome({ products }: { products: StorefrontCatalogueProduct[] }) {
  const screenProducts = useMemo(
    () => products.filter((p) => p.category === "screen" || p.category === "window"),
    [products],
  );

  return (
    <main data-testid="fixmonger-home">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-pumpkin">Fixmonger</p>
          <h1 className="mt-3 display text-4xl leading-tight text-cream sm:text-5xl">
            Keep windows open. pets in, bugs out, all year.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Magnetic door curtains, window insect mesh, and draught excluders from a UK warehouse partner. Free UK
            delivery on every order.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2 text-sm font-medium text-cream/90" aria-label="Categories">
            {["Cat-safe windows", "Insect & spider screens", "Door curtains", "Thermal/draught"].map((label) => (
              <span key={label} className="rounded-full border border-line px-3 py-1">
                {label}
              </span>
            ))}
          </nav>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#window"
              className="min-h-12 rounded-full bg-pumpkin px-6 text-sm font-semibold text-white inline-flex items-center"
            >
              Shop screens
            </Link>
            <Link
              href="#door"
              className="min-h-12 rounded-full border border-line px-6 text-sm font-medium text-cream inline-flex items-center"
            >
              Door curtains
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line shadow-lg">
          <Image
            src="/stores/fixmonger/hero.jpg"
            alt="Fixmonger magnetic door curtain and window mesh"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
            priority
            sizes="(max-width:768px) 100vw, 50vw"
          />
        </div>
      </section>

      <TrustRow />

      <section id="catsafe" className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-line bg-bark/40 px-6 py-8 text-center">
          <h2 className="display text-2xl text-cream">Cat-safe windows, coming soon</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            We are sourcing a pet-grade, own-brand window screen. Until then, our cut-to-fit insect mesh is for bugs,
            not claws. We will never call standard polyester mesh cat-proof.
          </p>
        </div>
      </section>

      {SECTIONS.filter((s) => s.id !== "catsafe").map((section) => {
        const items =
          section.id === "window"
            ? screenProducts
            : products.filter((p) => section.categories.includes(p.category));
        if (!items.length) return null;
        return (
          <section key={section.id} id={section.id} className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="display text-3xl text-cream">{section.title}</h2>
            <p className="mt-2 text-muted">{section.blurb}</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="fixmonger-product-grid">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      })}

      <ReviewsPlaceholder />
      <ShopFaq items={FAQ} />
      <EmailCapture storeName="Fixmonger" />
    </main>
  );
}
