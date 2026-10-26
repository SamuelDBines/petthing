import { FixmongerCartPage } from "@/components/fixmonger/cart-page";

export const instant = false;
import { listCatalogueProducts } from "@/lib/catalogue/products";
import { toStorefrontProducts } from "@/lib/catalogue/storefront";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { redirect } from "next/navigation";

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue" && config.storeType !== "christmas") redirect("/");
  return (
    <FixmongerCartPage storeId={storeId} products={toStorefrontProducts(listCatalogueProducts(storeId))} />
  );
}
