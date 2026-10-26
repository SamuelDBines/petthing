import { FIXMONGER_SEED_PRODUCTS } from "@/config/catalogue/fixmonger-seed";
import { JINGLEFOLD_DECOR_PRODUCTS } from "@/config/catalogue/jinglefold-seed";
import type { CatalogueProduct } from "@/lib/catalogue/types";

const SEED_BY_STORE: Record<string, CatalogueProduct[]> = {
  fixmonger: FIXMONGER_SEED_PRODUCTS,
  jinglefold: JINGLEFOLD_DECOR_PRODUCTS,
};

let dbOverrides: CatalogueProduct[] = [];

export function setCatalogueProductOverrides(products: CatalogueProduct[]) {
  dbOverrides = products;
}

export function listCatalogueProducts(storeId: string): CatalogueProduct[] {
  const seed = SEED_BY_STORE[storeId] ?? [];
  const overrides = dbOverrides.filter((p) => p.storeId === storeId);
  const byId = new Map<string, CatalogueProduct>();
  for (const product of seed) byId.set(product.id, product);
  for (const product of overrides) byId.set(product.id, product);
  return [...byId.values()].filter((p) => p.active);
}

export function getCatalogueProduct(storeId: string, idOrSlug: string) {
  return listCatalogueProducts(storeId).find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

export function marginPence(product: CatalogueProduct) {
  return product.pricePence - product.costPence;
}
