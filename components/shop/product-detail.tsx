"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatGbp } from "@/config/pricing";
import { ProductCard } from "@/components/shop/product-card";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { addToCart } from "@/lib/cart/storage";

type Props = {
  product: StorefrontCatalogueProduct;
  crossSells: StorefrontCatalogueProduct[];
  cutoffNote?: string | null;
};

export function ShopProductDetail({ product, crossSells, cutoffNote }: Props) {
  const gallery = product.imageMeta?.length
    ? product.imageMeta
    : product.images.map((src, i) => ({ src, width: 800, height: 800, alt: `${product.name} ${i + 1}` }));
  const [active, setActive] = useState(0);
  const main = gallery[active] ?? gallery[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10" data-testid="shop-product-detail">
      <Link href="/" className="text-sm text-moss">← Shop</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          {main ? (
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-bark">
              <Image
                src={main.src}
                alt={main.alt}
                width={main.width}
                height={main.height}
                className="h-full w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          ) : null}
          {gallery.length > 1 ? (
            <ul className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((img, index) => (
                <li key={img.src}>
                  <button
                    type="button"
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${index === active ? "border-pumpkin" : "border-line"}`}
                    onClick={() => setActive(index)}
                  >
                    <Image src={img.src} alt="" width={64} height={64} className="h-full w-full object-cover" sizes="64px" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <h1 className="display text-4xl text-cream">{product.name}</h1>
          {product.benefitLine ? <p className="mt-2 text-lg text-moss">{product.benefitLine}</p> : null}
          <p className="mt-4 text-2xl font-semibold text-cream">
            {formatGbp(product.pricePence)}
            {product.compareAtPricePence ? (
              <span className="ml-2 text-base font-normal text-moss line-through">{formatGbp(product.compareAtPricePence)}</span>
            ) : null}
          </p>
          {product.deliveryEstimate ? <p className="mt-2 text-sm text-moss">{product.deliveryEstimate}</p> : null}
          {cutoffNote ? <p className="mt-2 text-sm text-pumpkin">{cutoffNote}</p> : null}
          <button
            type="button"
            className="mt-6 min-h-12 rounded-full bg-pumpkin px-8 text-sm font-semibold text-white"
            onClick={() => addToCart(product.id, 1)}
          >
            Add to cart
          </button>
          {product.longDescription ? <p className="mt-6 text-moss leading-7">{product.longDescription}</p> : null}
          {product.specs?.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-moss">
              {product.specs.map((spec) => <li key={spec}>{spec}</li>)}
            </ul>
          ) : null}
          {product.clpSafetyText ? (
            <section className="mt-6 rounded-xl border border-line bg-bark p-4 text-sm" data-testid="clp-safety">
              <h2 className="font-medium text-cream">Safety &amp; CLP</h2>
              <p className="mt-2 text-moss">{product.clpSafetyText}</p>
            </section>
          ) : null}
          {product.gpsrSafetyText ? (
            <section className="mt-6 rounded-xl border border-line bg-bark p-4 text-sm" data-testid="gpsr-safety">
              <h2 className="font-medium text-cream">Product safety (GPSR)</h2>
              <p className="mt-2 text-moss">{product.gpsrSafetyText}</p>
            </section>
          ) : null}
        </div>
      </div>
      {crossSells.length ? (
        <section className="mt-16">
          <h2 className="display text-2xl text-cream">Complete the kit</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {crossSells.map((item) => <ProductCard key={item.id} product={item} compact />)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
