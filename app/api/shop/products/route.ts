import { FIXMONGER_DELIVERY } from "@/config/catalogue/pricing-seed";
import { listCatalogueProducts } from "@/lib/catalogue/products";
import { toStorefrontProducts } from "@/lib/catalogue/storefront";
import { requestStoreId } from "@/lib/tenant/context";
import { loadStoreConfig } from "@/lib/tenant/context";

export async function GET() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue") return Response.json({ products: [] });
  const products = toStorefrontProducts(listCatalogueProducts(storeId));
  return Response.json({
    products,
    delivery: {
      freeOverPence: FIXMONGER_DELIVERY.freeDeliveryOverPence,
      standardPence: FIXMONGER_DELIVERY.standardDeliveryPence,
    },
  });
}
