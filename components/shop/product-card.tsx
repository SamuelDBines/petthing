"use client";

import Image from "next/image";
import Link from "next/link";
import { formatGbp } from "@/config/pricing";
import type { StorefrontCatalogueProduct } from "@/lib/catalogue/types";
import { addToCart } from "@/lib/cart/storage";
import { trackMetaEvent } from "@/lib/meta/client";

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
  const href = `/shop/${product.slug}`;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bark shadow-sm">
      <Link
        href={href}
        data-testid="product-card-link"
        className="relative block aspect-square bg-ink/40 after:absolute after:inset-0 after:content-['']"
        aria-label={`View ${product.name}`}
      >
        <Image src={src} alt={alt} width={w} height={h} className="h-full w-full object-cover" sizes="(max-width:640px) 100vw, 33vw" />
      </Link>
      <div className="relative z-10 flex flex-1 flex-col p-4">
        <h3 className="display text-lg leading-snug text-cream">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {!compact && product.benefitLine ? <p className="mt-1 text-sm text-muted line-clamp-2">{product.benefitLine}</p> : null}
        <p className="mt-3 font-semibold text-cream">
          {formatGbp(product.pricePence)}
          {product.compareAtPricePence ? (
            <span className="ml-2 text-sm font-normal text-muted line-through">{formatGbp(product.compareAtPricePence)}</span>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="pointer-events-auto relative z-20 rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              addToCart(product.id, 1);
              trackMetaEvent("AddToCart", { value: product.pricePence / 100, currency: "GBP", contentIds: [product.id] });
              onAdded?.();
            }}
          >
            Add to cart
          </button>
          <Link href={href} className="pointer-events-auto relative z-20 rounded-full border border-line px-4 py-2 text-sm text-cream">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
