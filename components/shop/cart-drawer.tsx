"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatGbp } from "@/config/pricing";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { readCart, subscribeCart, writeCart } from "@/lib/cart/storage";

type DeliveryConfig = { freeOverPence: number; standardPence: number };

export function CartDrawer({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<StorefrontCatalogueProduct[]>([]);
  const [delivery, setDelivery] = useState<DeliveryConfig>({ freeOverPence: 2000, standardPence: 299 });
  const [lines, setLines] = useState(readCart());

  const refresh = useCallback(() => setLines(readCart()), []);

  useEffect(() => subscribeCart(refresh), [refresh]);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        if (data.delivery) setDelivery(data.delivery);
      })
      .catch(() => undefined);
  }, [storeId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  const enriched = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return lines
      .map((line) => {
        const product = byId.get(line.productId);
        if (!product) return null;
        return { line, product };
      })
      .filter(Boolean) as { line: { productId: string; quantity: number }; product: StorefrontCatalogueProduct }[];
  }, [lines, products]);

  const subtotal = enriched.reduce((sum, row) => sum + row.product.pricePence * row.line.quantity, 0);
  const awayPence = Math.max(0, delivery.freeOverPence - subtotal);
  const progress = Math.min(100, Math.round((subtotal / delivery.freeOverPence) * 100));

  function setQuantity(productId: string, quantity: number) {
    const next = readCart()
      .map((line) => (line.productId === productId ? { ...line, quantity } : line))
      .filter((line) => line.quantity > 0);
    writeCart(next);
    refresh();
    window.dispatchEvent(new Event("ps-cart-updated"));
  }

  return (
    <>
      <button
        type="button"
        className="rounded-full border border-line bg-bark px-4 py-2 text-sm font-medium text-cream"
        onClick={() => setOpen(true)}
        data-testid="shop-cart-button"
        aria-expanded={open}
      >
        Cart ({count})
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-cream/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <button type="button" className="absolute inset-0" aria-label="Close cart" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-ink shadow-xl">
            <header className="flex items-center justify-between border-b border-line px-4 py-4">
              <h2 className="display text-xl text-cream">Your cart</h2>
              <button type="button" className="text-sm text-moss" onClick={() => setOpen(false)}>Close</button>
            </header>
            <div className="border-b border-line px-4 py-3">
              {awayPence > 0 ? (
                <p className="text-sm text-moss">
                  <span className="font-medium text-cream">{formatGbp(awayPence)}</span> away from free UK delivery
                </p>
              ) : (
                <p className="text-sm font-medium text-moss">You have free UK delivery</p>
              )}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/40">
                <div className="h-full rounded-full bg-pumpkin transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto px-4 py-4">
              {enriched.length === 0 ? (
                <li className="text-sm text-moss">Your cart is empty.</li>
              ) : (
                enriched.map(({ line, product }) => {
                  const img = product.imageMeta?.[0]?.src ?? product.images[0];
                  return (
                    <li key={line.productId} className="flex gap-3 border-b border-line py-4 last:border-0">
                      {img ? (
                        <Image src={img} alt="" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />
                      ) : null}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-cream">{product.name}</p>
                        <p className="text-sm text-moss">{formatGbp(product.pricePence)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" className="rounded border border-line px-2 text-sm" onClick={() => setQuantity(line.productId, line.quantity - 1)} aria-label="Decrease quantity">−</button>
                          <span className="text-sm text-cream">{line.quantity}</span>
                          <button type="button" className="rounded border border-line px-2 text-sm" onClick={() => setQuantity(line.productId, line.quantity + 1)} aria-label="Increase quantity">+</button>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <footer className="border-t border-line px-4 py-4">
              <p className="flex justify-between text-sm text-cream">
                <span>Subtotal</span>
                <span className="font-semibold">{formatGbp(subtotal)}</span>
              </p>
              <Link
                href="/shop/cart"
                className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-pumpkin text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Checkout
              </Link>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
