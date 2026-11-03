import Link from "next/link";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { legalCopyForStore, legalWhoWeAre } from "@/lib/legal/store-legal";

export const metadata = { title: "Shipping" };

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  const copy = legalCopyForStore(config);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Shipping &amp; delivery</h1>
      <p className="mt-4 text-sm text-cream/60">Last updated: 28 October 2026</p>
      <p className="mt-6">{legalWhoWeAre(copy)}</p>
      <p className="mt-6">{copy.shippingNotes}</p>
      {copy.productKind === "digital_portraits" ? (
        <p className="mt-6">
          Digital portraits are not shipped physically; you receive an email when your gallery is ready. Optional printed items follow the times above once ordered from your gallery.
        </p>
      ) : (
        <p className="mt-6">
          We ship to UK addresses unless stated otherwise on the product page. International delivery is not offered at launch.
        </p>
      )}
      <p className="mt-8 text-sm text-cream/60">
        Questions? <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a> · <Link href="/refunds">Returns</Link>
      </p>
    </main>
  );
}
