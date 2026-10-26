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

export function upsertCatalogueOverride(product: CatalogueProduct) {
  const idx = dbOverrides.findIndex((p) => p.storeId === product.storeId && p.id === product.id);
  if (idx >= 0) dbOverrides[idx] = product;
  else dbOverrides.push(product);
}

export function listCatalogueOverrides(storeId?: string) {
  return storeId ? dbOverrides.filter((p) => p.storeId === storeId) : [...dbOverrides];
}

export function mergeCatalogueProducts(storeId: string, seed: CatalogueProduct[], overrides: CatalogueProduct[]) {
  const byId = new Map<string, CatalogueProduct>();
  for (const product of seed) byId.set(product.id, product);
  for (const product of overrides.filter((p) => p.storeId === storeId)) byId.set(product.id, product);
  return [...byId.values()];
}

export async function catalogueOverridesForStore(storeId: string): Promise<CatalogueProduct[]> {
  const { getStore } = await import("@/lib/store");
  const store = getStore();
  if (store.listCatalogueProductOverrides) return store.listCatalogueProductOverrides(storeId);
  return listCatalogueOverrides(storeId);
}

export async function listCatalogueProducts(storeId: string): Promise<CatalogueProduct[]> {
  const seed = SEED_BY_STORE[storeId] ?? [];
  const overrides = await catalogueOverridesForStore(storeId);
  return mergeCatalogueProducts(storeId, seed, overrides).filter((p) => p.active);
}

export async function getCatalogueProduct(storeId: string, idOrSlug: string) {
  const products = await listCatalogueProducts(storeId);
  return products.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

export function marginPence(product: CatalogueProduct) {
  return product.pricePence - product.costPence;
}
