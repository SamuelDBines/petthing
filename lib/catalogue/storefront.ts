import type { CatalogueProduct, StorefrontCatalogueProduct } from "@/lib/catalogue/types";

export function toStorefrontProduct(product: CatalogueProduct): StorefrontCatalogueProduct {
  const { costPence: _cost, bundleComponents: _bundle, ...rest } = product;
  return rest;
}

export function toStorefrontProducts(products: CatalogueProduct[]) {
  return products.map(toStorefrontProduct);
}
