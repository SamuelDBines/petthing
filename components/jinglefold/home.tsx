"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGbp } from "@/config/pricing";
import { JINGLEFOLD_DELIVERY, JINGLEFOLD_PERSONALISED_PRODUCTS } from "@/config/jinglefold";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { addToCart, readCart } from "@/lib/cart/storage";

export function JinglefoldHome({ decor }: { decor: StorefrontCatalogueProduct[] }) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10" data-testid="jinglefold-home">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-[var(--gold)]">Jinglefold</p>
          <h1 className="font-display text-4xl text-[var(--ink)]">Personalised Christmas, folded into your home.</h1>
          <p className="mt-2 max-w-xl text-[var(--moss)]">
            Upload a photo for ornaments and stockings, or shop ready-made UK decor. Free delivery over{" "}
            {formatGbp(JINGLEFOLD_DELIVERY.freeDeliveryOverPence)}.
          </p>
        </div>
        <Link
          href="/shop/cart"
          className="rounded-full border border-[var(--line)] bg-[var(--bark)] px-5 py-2 text-sm font-medium"
          data-testid="jinglefold-cart-link"
        >
          Cart ({cartCount})
        </Link>
      </header>

      <section className="mb-12" data-testid="jinglefold-personalised">
        <h2 className="font-display text-2xl text-[var(--ink)]">Personalised for you</h2>
        <p className="mt-1 text-sm text-[var(--moss)]">Preview your artwork before you pay.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {JINGLEFOLD_PERSONALISED_PRODUCTS.map((product) => (
            <li key={product.id} className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4">
              <h3 className="font-medium text-[var(--ink)]">{product.name}</h3>
              <p className="mt-1 text-sm text-[var(--moss)] line-clamp-2">{product.detail}</p>
              <Link
                href={`/personalise/${product.slug}`}
                className="mt-3 inline-block rounded-full bg-[var(--pumpkin)] px-4 py-2 text-sm font-medium text-white"
                data-testid={`jinglefold-personalise-${product.slug}`}
              >
                Personalise
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="jinglefold-decor-grid">
        <h2 className="font-display text-2xl text-[var(--ink)]">Ready-made decor</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {decor.map((product) => (
            <article key={product.id} className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4 shadow-sm">
              <h3 className="font-display text-lg text-[var(--ink)]">
                <Link href={`/shop/${product.slug}`}>{product.name}</Link>
              </h3>
              <p className="mt-1 text-sm text-[var(--moss)] line-clamp-2">{product.description}</p>
              <p className="mt-3 font-semibold">{formatGbp(product.pricePence)}</p>
              <button
                type="button"
                className="mt-3 rounded-full bg-[var(--pumpkin)] px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  addToCart(product.id, 1);
                  setCartCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
                }}
              >
                Add to cart
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
