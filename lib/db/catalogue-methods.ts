import type { CatalogueProduct } from "@/lib/catalogue/types";
import { getSql } from "@/lib/db/client";

function rowToProduct(row: Record<string, unknown>): CatalogueProduct {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    slug: String(row.slug),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description ?? ""),
    supplier: row.supplier as CatalogueProduct["supplier"],
    supplierSku: String(row.supplier_sku),
    costPence: Number(row.cost_pence),
    pricePence: Number(row.price_pence),
    stock: Number(row.stock),
    images: (row.images as string[]) ?? [],
    variants: (row.variants as CatalogueProduct["variants"]) ?? [],
    active: Boolean(row.active),
  };
}

export const catalogueDbMethods = {
  async listCatalogueProductOverrides(storeId: string) {
    const rows = await getSql()`select * from catalogue_products where store_id = ${storeId}`;
    return (rows as Record<string, unknown>[]).map(rowToProduct);
  },
  async upsertCatalogueProduct(product: CatalogueProduct) {
    await getSql()`
      insert into catalogue_products (
        id, store_id, slug, name, category, description, supplier, supplier_sku,
        cost_pence, price_pence, stock, images, variants, active
      ) values (
        ${product.id}, ${product.storeId}, ${product.slug}, ${product.name}, ${product.category},
        ${product.description}, ${product.supplier}, ${product.supplierSku},
        ${product.costPence}, ${product.pricePence},
        ${product.stock}, ${JSON.stringify(product.images)}::jsonb, ${JSON.stringify(product.variants)}::jsonb,
        ${product.active}
      )
      on conflict (store_id, id) do update set
        slug = excluded.slug,
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        price_pence = excluded.price_pence,
        stock = excluded.stock,
        active = excluded.active
    `;
    return product;
  },
};
