"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatGbp } from "@/config/pricing";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { ShopCartLine } from "@/lib/catalogue/types";
import { readCart, writeCart } from "@/lib/cart/storage";

export function FixmongerCartPage({ products }: { products: CatalogueProduct[] }) {
  const [lines, setLines] = useState<ShopCartLine[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLines(readCart());
  }, []);

  const rows = lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      return { line, product, total: product.pricePence * line.quantity };
    })
    .filter(Boolean) as { line: ShopCartLine; product: CatalogueProduct; total: number }[];

  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);

  async function checkout() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, lines }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Checkout failed");
      return;
    }
    writeCart([]);
    window.location.href = body.url;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="fixmonger-cart">
      <h1 className="font-display text-3xl">Your cart</h1>
      {!rows.length ? (
        <p className="mt-4 text-[var(--moss)]">
          Nothing here yet. <Link href="/">Browse fixes</Link>
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {rows.map(({ line, product, total }) => (
              <li key={product.id} className="flex justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-[var(--moss)]">Qty {line.quantity}</p>
                </div>
                <p>{formatGbp(total)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right font-semibold">Subtotal {formatGbp(subtotal)} · Free UK delivery</p>
          <label className="mt-6 block text-sm">
            Email for receipt
            <input
              className="field mt-1 w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="fixmonger-checkout-email"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={busy || !email}
            className="mt-4 w-full rounded-full bg-[var(--pumpkin)] py-3 font-medium text-white disabled:opacity-50"
            onClick={checkout}
            data-testid="fixmonger-checkout"
          >
            {busy ? "Opening checkout…" : "Checkout"}
          </button>
        </>
      )}
    </main>
  );
}
