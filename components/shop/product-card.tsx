"use client";

import Image from "next/image";
import Link from "next/link";
import { formatGbp } from "@/config/pricing";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { addToCart } from "@/lib/cart/storage";

type Props = {
  product: StorefrontCatalogueProduct;
  onAdded?: () => void;
  compact?: boolean;
};

export function ProductCard({ product, onAdded, compact }: Props) {
  const img = product.imageMeta?.[0];
  const src = img?.src ?? product.images[0] ?? "/logo.svg";
  const w = img?.width ?? 800;
  const h = img?.height ?? 800;
  const alt = img?.alt ?? product.name;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bark shadow-sm">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-square bg-ink/40">
        <Image src={src} alt={alt} width={w} height={h} className="h-full w-full object-cover" sizes="(max-width:640px) 100vw, 33vw" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="display text-lg leading-snug text-cream">
          <Link href={`/shop/${product.slug}`}>{product.name}</Link>
        </h3>
        {!compact && product.benefitLine ? <p className="mt-1 text-sm text-moss line-clamp-2">{product.benefitLine}</p> : null}
        <p className="mt-3 font-semibold text-cream">
          {formatGbp(product.pricePence)}
          {product.compareAtPricePence ? (
            <span className="ml-2 text-sm font-normal text-moss line-through">{formatGbp(product.compareAtPricePence)}</span>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              addToCart(product.id, 1);
              onAdded?.();
            }}
          >
            Add to cart
          </button>
          <Link href={`/shop/${product.slug}`} className="rounded-full border border-line px-4 py-2 text-sm text-cream">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
