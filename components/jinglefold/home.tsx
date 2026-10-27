"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { formatGbp } from "@/config/pricing";
import { JINGLEFOLD_DELIVERY, JINGLEFOLD_PERSONALISED_PRODUCTS } from "@/config/jinglefold";
import { resolveProductImages } from "@/lib/catalogue/product-images";
import {
  ChristmasCountdown,
  EmailCapture,
  HowPersonalisedWorks,
  ReviewsPlaceholder,
  ShopFaq,
  TrustRow,
} from "@/components/shop/marketing-sections";
import { ProductCard } from "@/components/shop/product-card";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";

const FAQ: [string, string][] = [
  ["When should I order for Christmas?", "See the cut-off banner — personalised prints have earlier dates than ready-made decor."],
  ["Do I see my artwork before paying?", "Yes. Personalised items include a preview step before checkout."],
  ["Where do decor items ship from?", "UK warehouse — typically 3–5 working days."],
  ["Can I return personalised items?", "Because they are made for you, personalised goods are non-returnable unless faulty."],
];

const DECOR_SECTIONS: { id: string; title: string; categories: string[] }[] = [
  { id: "tree", title: "Tree", categories: ["tree", "bundles"] },
  { id: "home-door", title: "Home & door", categories: ["door", "home"] },
  { id: "gifts", title: "Gifts", categories: ["gifts"] },
];

export function JinglefoldHome({ decor }: { decor: StorefrontCatalogueProduct[] }) {
  const treeItems = useMemo(
    () => decor.filter((p) => p.category === "tree" || p.category === "bundles"),
    [decor],
  );

  return (
    <main data-testid="jinglefold-home">
      <ChristmasCountdown deadlineIso="2026-12-14T23:59:00.000Z" label="Order ready-made decor by 14 Dec for Christmas delivery (UK estimate)" />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Jinglefold</p>
          <h1 className="mt-3 display text-4xl leading-tight text-cream sm:text-5xl">Personalised Christmas, folded into your home.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Upload a photo for ornaments and stockings, or shop ready-made UK decor. Free delivery over{" "}
            {formatGbp(JINGLEFOLD_DELIVERY.freeDeliveryOverPence)}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#personalised" className="inline-flex min-h-12 items-center rounded-full bg-pumpkin px-6 text-sm font-semibold text-white">
              Personalise a gift
            </Link>
            <Link href="#tree" className="inline-flex min-h-12 items-center rounded-full border border-line px-6 text-sm font-medium text-cream">
              Shop the tree
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line shadow-lg">
          <Image
            src="/stores/jinglefold/hero.jpg"
            alt="Cosy Christmas living room with tree and gifts"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
            priority
            sizes="(max-width:768px) 100vw, 50vw"
          />
        </div>
      </section>

      <TrustRow />

      <section id="personalised" className="mx-auto max-w-6xl px-4 py-14" data-testid="jinglefold-personalised">
        <h2 className="display text-3xl text-cream">Personalised for you</h2>
        <p className="mt-2 text-muted">Preview your artwork before you pay.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {JINGLEFOLD_PERSONALISED_PRODUCTS.map((product) => {
            const { meta } = resolveProductImages(
              "jinglefold",
              product.pricingSku,
              "/stores/jinglefold/placeholder-ornament.svg",
              product.name,
            );
            const img = meta[0];
            return (
              <li key={product.id} className="overflow-hidden rounded-2xl border border-line bg-bark">
                <div className="relative aspect-square bg-ink/30">
                  <Image src={img.src} alt={img.alt} width={img.width} height={img.height} className="h-full w-full object-cover" sizes="33vw" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-cream">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{product.detail}</p>
                  <Link
                    href={`/personalise/${product.slug}`}
                    className="mt-4 inline-flex rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-white"
                    data-testid={`jinglefold-personalise-${product.slug}`}
                  >
                    Personalise
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <HowPersonalisedWorks />

      {DECOR_SECTIONS.map((section) => {
        const items = decor.filter((p) => section.categories.includes(p.category));
        if (!items.length && section.id !== "tree") return null;
        const list = section.id === "tree" ? treeItems : items;
        return (
          <section key={section.id} id={section.id} className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="display text-3xl text-cream">{section.title}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="jinglefold-decor-grid">
              {list.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        );
      })}

      <ReviewsPlaceholder />
      <ShopFaq items={FAQ} />
      <EmailCapture storeName="Jinglefold" />
    </main>
  );
}
