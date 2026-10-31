import { connection } from "next/server";
import { notFound } from "next/navigation";
import { JinglefoldPersonaliseWizard } from "@/components/jinglefold/personalise-wizard";
import { jinglefoldPersonalisedBySlug, JINGLEFOLD_PERSONALISED_TIERS } from "@/config/jinglefold";
import { catalogueMainImage } from "@/lib/catalogue/product-images";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { getCatalog } from "@/lib/catalog";
import { redirect } from "next/navigation";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const storeId = await requestStoreId();
  if (storeId !== "jinglefold") redirect("/");
  const { slug } = await params;
  const product = jinglefoldPersonalisedBySlug(slug);
  if (!product) notFound();
  const tier = JINGLEFOLD_PERSONALISED_TIERS.find((t) => t.id === product.id);
  const config = await loadStoreConfig(storeId);
  const { theme } = await getCatalog(storeId);
  const cutoffs = config.catalog.jinglefold?.cutoffs ?? {
    prodigiBaubleIso: "2026-12-10T23:59:00.000Z",
    printfulStockingIso: "2026-11-26T23:59:00.000Z",
    goDropshipDecorIso: "2026-12-14T23:59:00.000Z",
  };
  const mockup = catalogueMainImage("jinglefold", product.pricingSku);
  const mockupSrc = mockup?.path ?? "/stores/jinglefold/placeholder-ornament.svg";
  const mockupWidth = mockup?.width ?? 800;
  const mockupHeight = mockup?.height ?? 800;

  return (
    <JinglefoldPersonaliseWizard
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        detail: product.detail,
        cutoffKind: product.cutoffKind === "go_dropship" ? "prodigi_bauble" : product.cutoffKind,
        pricePence: tier?.pricePence ?? 0,
        mockupSrc,
        mockupWidth,
        mockupHeight,
      }}
      cutoffs={cutoffs}
      styles={theme.styles}
    />
  );
}
