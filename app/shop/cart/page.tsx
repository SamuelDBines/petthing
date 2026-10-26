import { connection } from "next/server";
import { FixmongerCartPage } from "@/components/fixmonger/cart-page";
import { listCatalogueProducts } from "@/lib/catalogue/products";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { redirect } from "next/navigation";

export default async function Page() {
  await connection();
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "catalogue") redirect("/");
  return <FixmongerCartPage products={listCatalogueProducts(storeId)} />;
}
