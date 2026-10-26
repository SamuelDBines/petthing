import { listCatalogueProducts } from "@/lib/catalogue/products";
import { requestStoreId } from "@/lib/tenant/context";
import { loadStoreConfig } from "@/lib/tenant/context";

export async function GET() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue") return Response.json({ products: [] });
  const products = listCatalogueProducts(storeId);
  return Response.json({ products, freeUkShipping: config.catalog.freeUkShipping ?? true });
}
