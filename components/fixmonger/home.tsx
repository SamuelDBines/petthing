"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGbp } from "@/config/pricing";
import { FIXMONGER_DELIVERY } from "@/config/catalogue/pricing-seed";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { addToCart, readCart } from "@/lib/cart/storage";

export function FixmongerHome({ products: initialProducts }: { products: StorefrontCatalogueProduct[] }) {
  const [products] = useState<StorefrontCatalogueProduct[]>(initialProducts);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-[var(--gold)]">Fixmonger</p>
          <h1 className="font-display text-4xl text-[var(--ink)]">Cheap fixes for proper British weather.</h1>
          <p className="mt-2 max-w-xl text-[var(--moss)]">
            Frost covers, draught curtains, and the other sensible bits your shed should have had years ago. Free UK
            delivery on orders over {formatGbp(FIXMONGER_DELIVERY.freeDeliveryOverPence)}.
          </p>
        </div>
        <Link
          href="/shop/cart"
          className="rounded-full border border-[var(--line)] bg-[var(--bark)] px-5 py-2 text-sm font-medium"
          data-testid="fixmonger-cart-link"
        >
          Cart ({cartCount})
        </Link>
      </header>
      <section className="grid gap-6 sm:grid-cols-2" data-testid="fixmonger-product-grid">
        {products.map((product) => (
          <article key={product.id} className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4 shadow-sm">
            <div className="mb-3 flex h-40 items-center justify-center rounded-xl bg-[var(--bark)]">
              <img src={product.images[0]} alt="" className="h-24 w-24 opacity-80" />
            </div>
            <h2 className="font-display text-xl text-[var(--ink)]">
              <Link href={`/shop/${product.slug}`}>{product.name}</Link>
            </h2>
            <p className="mt-1 text-sm text-[var(--moss)] line-clamp-2">{product.description}</p>
            <p className="mt-3 font-semibold text-[var(--ink)]">
              {formatGbp(product.pricePence)}
              {product.compareAtPricePence ? (
                <span className="ml-2 text-sm font-normal text-[var(--moss)] line-through">
                  {formatGbp(product.compareAtPricePence)}
                </span>
              ) : null}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full bg-[var(--pumpkin)] px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  addToCart(product.id, 1);
                  setCartCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
                }}
              >
                Add to cart
              </button>
              <Link href={`/shop/${product.slug}`} className="rounded-full border px-4 py-2 text-sm">
                Details
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
