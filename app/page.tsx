import { FixmongerHome } from "@/components/fixmonger/home";
import { HomePage } from "@/components/home";
import { listCatalogueProducts } from "@/lib/catalogue/products";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType === "catalogue") {
    return <FixmongerHome products={listCatalogueProducts(storeId)} />;
  }
  return <HomePage />;
}
