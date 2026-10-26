import { FIXMONGER_DELIVERY } from "@/config/catalogue/pricing-seed";
import { JINGLEFOLD_DELIVERY } from "@/config/jinglefold";
import { listCatalogueProducts } from "@/lib/catalogue/products";
import { toStorefrontProducts } from "@/lib/catalogue/storefront";
import { requestStoreId } from "@/lib/tenant/context";
import { loadStoreConfig } from "@/lib/tenant/context";

export async function GET() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue" && config.storeType !== "christmas") return Response.json({ products: [] });
  const products = toStorefrontProducts(listCatalogueProducts(storeId));
  const delivery =
    storeId === "jinglefold"
      ? {
          freeOverPence: JINGLEFOLD_DELIVERY.freeDeliveryOverPence,
          standardPence: JINGLEFOLD_DELIVERY.standardDeliveryPence,
        }
      : {
          freeOverPence: FIXMONGER_DELIVERY.freeDeliveryOverPence,
          standardPence: FIXMONGER_DELIVERY.standardDeliveryPence,
        };
  return Response.json({ products, delivery });
}
