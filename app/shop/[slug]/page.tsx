import { notFound, redirect } from "next/navigation";
import { ShopProductDetail } from "@/components/shop/product-detail";
import { cutoffIsoForKind, isPastCutoff } from "@/config/jinglefold";
import { crossSellProducts } from "@/lib/shop/cross-sells";
import { getCatalogueProduct, listCatalogueProducts } from "@/lib/catalogue/products";
import { toStorefrontProduct } from "@/lib/catalogue/storefront";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const storeId = await requestStoreId();
  const { slug } = await params;
  const product = await getCatalogueProduct(storeId, slug);
  if (!product) return {};
  const config = await loadStoreConfig(storeId);
  return {
    title: product.name,
    description: product.benefitLine ?? product.description,
    openGraph: {
      title: product.name,
      description: product.benefitLine ?? product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : config.brand.ogImagePath ? [{ url: config.brand.ogImagePath }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "christmas" && config.storeType !== "catalogue") redirect("/");
  const { slug } = await params;
  const product = await getCatalogueProduct(storeId, slug);
  if (!product || !product.active) notFound();
  const catalogue = await listCatalogueProducts(storeId);
  const crossSells = crossSellProducts(product, catalogue).map(toStorefrontProduct);
  const cutoffs = config.catalog.jinglefold?.cutoffs;
  const cutoffIso =
    product.cutoffKind && cutoffs ? cutoffIsoForKind(cutoffs, product.cutoffKind) : null;
  const past = cutoffIso ? isPastCutoff(cutoffIso) : false;
  const cutoffNote = cutoffIso
    ? past
      ? "May arrive after Christmas — order only if you are happy with late delivery."
      : `Order by ${new Date(cutoffIso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} for Christmas delivery (estimate).`
    : null;

  return <ShopProductDetail product={toStorefrontProduct(product)} crossSells={crossSells} cutoffNote={cutoffNote} />;
}
