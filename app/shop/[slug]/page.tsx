import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatGbp } from "@/config/pricing";
import { cutoffIsoForKind, isPastCutoff } from "@/config/jinglefold";
import { getCatalogueProduct } from "@/lib/catalogue/products";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  if (config.storeType !== "christmas" && config.storeType !== "catalogue") redirect("/");
  const { slug } = await params;
  const product = await getCatalogueProduct(storeId, slug);
  if (!product || !product.active) notFound();
  const cutoffs = config.catalog.jinglefold?.cutoffs;
  const cutoffIso =
    product.cutoffKind && cutoffs ? cutoffIsoForKind(cutoffs, product.cutoffKind) : null;
  const past = cutoffIso ? isPastCutoff(cutoffIso) : false;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="shop-product-detail">
      <Link href="/" className="text-sm text-[var(--moss)]">← Shop</Link>
      <h1 className="mt-4 font-display text-3xl">{product.name}</h1>
      <p className="mt-2 text-[var(--moss)]">{product.description}</p>
      <p className="mt-4 text-xl font-semibold">{formatGbp(product.pricePence)}</p>
      {cutoffIso ? (
        <p className="mt-4 text-sm text-[var(--moss)]">
          {past
            ? "May arrive after Christmas — order only if you are happy with late delivery."
            : `Order by ${new Date(cutoffIso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} for Christmas delivery (estimate).`}
        </p>
      ) : null}
      {product.clpSafetyText ? (
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--bark)] p-4 text-sm" data-testid="clp-safety">
          <h2 className="font-medium">Safety &amp; CLP</h2>
          <p className="mt-2 text-[var(--moss)]">{product.clpSafetyText}</p>
        </section>
      ) : null}
      <Link href="/shop/cart" className="mt-8 inline-block rounded-full bg-[var(--pumpkin)] px-5 py-2 text-white">
        View cart
      </Link>
    </main>
  );
}
