import manifest from "@/config/catalogue/product-images.manifest.json";

export type ProductImageMeta = {
  path: string;
  width: number;
  height: number;
  alt: string;
  bytes?: number;
};

export type ProductImageManifestEntry = {
  main: ProductImageMeta;
  gallery: ProductImageMeta[];
  source?: string;
};

const entries = manifest as Record<string, ProductImageManifestEntry>;

export function catalogueImagesForSku(storeId: string, sku: string): ProductImageMeta[] {
  const entry = entries[`${storeId}:${sku}`];
  if (entry?.gallery?.length) return entry.gallery;
  if (entry?.main) return [entry.main];
  return [];
}

export function catalogueMainImage(storeId: string, sku: string): ProductImageMeta | null {
  const imgs = catalogueImagesForSku(storeId, sku);
  return imgs[0] ?? null;
}

function rotateGallery<T>(items: T[], startIndex: number): T[] {
  if (!items.length || startIndex <= 0) return items;
  const i = startIndex % items.length;
  return [...items.slice(i), ...items.slice(0, i)];
}

export function resolveProductImages(
  storeId: string,
  sku: string,
  fallback: string,
  altFallback: string,
  cardHeroIndex?: number,
): { paths: string[]; meta: import("@/lib/catalogue/types").CatalogueProductImage[] } {
  const fromManifest = catalogueImagesForSku(storeId, sku);
  if (fromManifest.length) {
    const ordered = rotateGallery(fromManifest, cardHeroIndex ?? 0);
    const meta = ordered.map((img) => ({
      src: img.path,
      width: img.width,
      height: img.height,
      alt: img.alt,
    }));
    return { paths: meta.map((m) => m.src), meta };
  }
  return {
    paths: [fallback],
    meta: [{ src: fallback, width: 800, height: 800, alt: altFallback }],
  };
}
