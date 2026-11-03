import type { CatalogueProduct, ShopOrderLine } from "@/lib/catalogue/types";

export function shopOrderLinesForProduct(product: CatalogueProduct, quantity: number): ShopOrderLine[] {
  if (product.kind === "bundle" && product.bundleComponents?.length) {
    return product.bundleComponents.map((component) => ({
      productId: product.id,
      name: `${product.name} (${component.label})`,
      supplierSku: component.supplierSku,
      supplier: product.supplier,
      quantity: component.quantity * quantity,
      unitPricePence: 0,
      costPence: component.costPence,
    }));
  }
  return [
    {
      productId: product.id,
      name: product.name,
      supplierSku: product.supplierSku,
      supplier: product.supplier,
      quantity,
      unitPricePence: product.pricePence,
      costPence: product.costPence,
    },
  ];
}
