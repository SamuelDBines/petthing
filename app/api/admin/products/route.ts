import { z } from "zod";
import { FIXMONGER_SEED_PRODUCTS } from "@/config/catalogue/fixmonger-seed";
import { JINGLEFOLD_DECOR_PRODUCTS } from "@/config/catalogue/jinglefold-seed";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { requireAdmin } from "@/lib/adminAuth";
import { mergeCatalogueProducts, upsertCatalogueOverride } from "@/lib/catalogue/products";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";

const SEED: Record<string, CatalogueProduct[]> = {
  fixmonger: FIXMONGER_SEED_PRODUCTS,
  jinglefold: JINGLEFOLD_DECOR_PRODUCTS,
};

async function productsForStore(storeId: string) {
  const seed = SEED[storeId] ?? [];
  const store = getStore();
  const overrides = store.listCatalogueProductOverrides
    ? await store.listCatalogueProductOverrides(storeId)
    : [];
  return mergeCatalogueProducts(storeId, seed, overrides);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const filter = await adminStoreFilter();
  if (filter === "all") {
    const stores = Object.keys(SEED);
    const byStore: Record<string, CatalogueProduct[]> = {};
    for (const id of stores) byStore[id] = await productsForStore(id);
    return Response.json({ byStore });
  }
  if (!SEED[filter]) return Response.json({ products: [] });
  return Response.json({ products: await productsForStore(filter) });
}

const patchSchema = z.object({
  storeId: z.string(),
  productId: z.string(),
  pricePence: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = parseBody(patchSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const products = await productsForStore(parsed.data.storeId);
  const product = products.find((p) => p.id === parsed.data.productId);
  if (!product) return jsonError("Product not found", 404);
  const next: CatalogueProduct = {
    ...product,
    pricePence: parsed.data.pricePence ?? product.pricePence,
    stock: parsed.data.stock ?? product.stock,
    active: parsed.data.active ?? product.active,
  };
  const store = getStore();
  if (store.upsertCatalogueProduct) await store.upsertCatalogueProduct(next);
  upsertCatalogueOverride(next);
  return Response.json({ product: next });
}
