import Link from "next/link";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { legalCopyForStore, legalWhoWeAre } from "@/lib/legal/store-legal";

export const metadata = { title: "Returns & refunds" };

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  const copy = legalCopyForStore(config);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Returns &amp; refunds</h1>
      <p className="mt-4 text-sm text-cream/60">Last updated: 28 October 2026</p>
      <p className="mt-6">{legalWhoWeAre(copy)}</p>

      {copy.productKind === "digital_portraits" ? (
        <>
          <h2 className="mt-8 text-2xl">Digital portraits</h2>
          <p className="mt-3">
            You agree to immediate supply of digital content at checkout and lose the 14-day cancellation right once download or email delivery begins. If a portrait is faulty or not as described, contact us within 30 days at{" "}
            <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a> and we will repair, replace, or refund as appropriate under consumer law.
          </p>
          <h2 className="mt-8 text-2xl">Printed add-ons</h2>
          <p className="mt-3">
            Printed puzzles and similar goods made to your specification are exempt from the usual 14-day cancellation right once production starts. Faulty print goods are refunded or replaced.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-8 text-2xl">14-day cancellation (Consumer Contracts Regulations)</h2>
          <p className="mt-3">
            For physical goods you may cancel within 14 days starting the day after delivery, without giving a reason. Email{" "}
            <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a> with your order number. Return items within 14 days of telling us, unused and in resaleable condition with original packaging where reasonable. We refund within 14 days of receiving the goods (or evidence of return postage).
          </p>
          {copy.personalisedReturnsText ? (
            <>
              <h2 className="mt-8 text-2xl">Personalised items</h2>
              <p className="mt-3">{copy.personalisedReturnsText}</p>
            </>
          ) : null}
          <h2 className="mt-8 text-2xl">Return postage</h2>
          <p className="mt-3">
            Unless the item is faulty, you pay return postage. We will confirm the returns address when you contact us.
          </p>
        </>
      )}

      <p className="mt-8">
        Delivery times are on our <Link href="/shipping">shipping</Link> page.
      </p>
    </main>
  );
}
