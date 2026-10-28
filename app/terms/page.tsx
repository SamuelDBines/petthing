import Link from "next/link";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { legalCopyForStore, legalWhoWeAre } from "@/lib/legal/store-legal";

export const metadata = { title: "Terms of use" };

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  const copy = legalCopyForStore(config);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Terms of use</h1>
      <p className="mt-4 text-sm text-cream/60">Last updated: 28 October 2026</p>

      <h2 className="mt-8 text-2xl">Who we are</h2>
      <p className="mt-3">
        {legalWhoWeAre(copy)} Email{" "}
        <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a>.
      </p>

      <h2 className="mt-8 text-2xl">What we sell</h2>
      {copy.productKind === "digital_portraits" ? (
        <p className="mt-3">
          We sell personalised digital pet portraits (and optional printed goods such as jigsaw puzzles) created with AI from photos you upload. Portraits are decorative gifts; they are not photographs and are labelled as AI-generated.
        </p>
      ) : copy.productKind === "physical_tools" ? (
        <p className="mt-3">
          We sell physical DIY and home-repair tools and accessories shipped to UK addresses. Product descriptions and safety information are shown on each product page.
        </p>
      ) : (
        <p className="mt-3">
          We sell physical Christmas home decor, including ready-made items and personalised ornaments created from your photos. Personalised items are made to your specification.
        </p>
      )}

      <h2 className="mt-8 text-2xl">Ordering and payment</h2>
      <p className="mt-3">
        Prices are shown in GBP and include UK VAT where applicable. Payment is processed by Stripe. A contract is formed when we accept your payment.
        {copy.productKind === "digital_portraits"
          ? " Digital portraits are supplied by email and private download link once they are ready."
          : " We will send order confirmation by email and fulfil physical goods as described on our shipping page."}
      </p>

      <h2 className="mt-8 text-2xl">Cancellation and returns</h2>
      {copy.productKind === "digital_portraits" ? (
        <p className="mt-3">
          For digital portraits you agree to immediate supply at checkout and acknowledge that you lose your 14-day right to cancel under the Consumer Contracts Regulations 2013 once delivery of the digital content begins. See our{" "}
          <Link href="/refunds">returns &amp; refunds</Link> page for faulty digital goods.
        </p>
      ) : (
        <p className="mt-3">
          You have a 14-day right to cancel under the Consumer Contracts Regulations 2013 for most distance sales of physical goods, starting the day after delivery. See our{" "}
          <Link href="/refunds">returns &amp; refunds</Link> page for how to cancel, return items, and any exemptions for personalised goods.
        </p>
      )}

      <h2 className="mt-8 text-2xl">Law</h2>
      <p className="mt-3">
        These terms are governed by the laws of England and Wales. Courts in England and Wales have exclusive jurisdiction, without affecting mandatory consumer protections in your home country if you live elsewhere in the UK.
      </p>
    </main>
  );
}
