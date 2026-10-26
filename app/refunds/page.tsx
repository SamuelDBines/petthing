import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/brand";

export const metadata = { title: "Returns & refunds" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Returns &amp; refunds</h1>

      <h2 className="mt-8 text-2xl">Digital portraits</h2>
      <p className="mt-3">
        When you buy digital portraits you agree at checkout to immediate supply by email and download link, and you acknowledge that you lose your 14-day right to cancel under the Consumer Contracts Regulations 2013 (regulation 37) once delivery begins.
      </p>
      <p className="mt-3">
        That does not affect your rights if the digital content is faulty or not as described. If a portrait does not reasonably resemble your pet (or other subject) from the photos you supplied, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will regenerate the affected style free of charge. If you are still unhappy after a reasonable regenerate, we will refund the portrait payment.
      </p>

      <h2 className="mt-8 text-2xl">Personalised printed goods</h2>
      <p className="mt-3">
        Jigsaw puzzles and other printed items are made to your specification (your chosen portrait and shipping details). Under the Consumer Contracts Regulations 2013 (regulation 28), personalised physical goods are exempt from the 14-day cancellation right once production has started.
      </p>
      <p className="mt-3">
        If a printed order arrives damaged, defective, or materially different from what you ordered, contact us within a reasonable time with photos of the issue. We will replace or refund as appropriate under the Consumer Rights Act 2015.
      </p>
      <p className="mt-3">
        Printed orders that have already gone to press cannot be cancelled for change of mind. If you need to change the shipping address before production starts, email us as soon as possible.
      </p>

      <h2 className="mt-8 text-2xl">Priority delivery</h2>
      <p className="mt-3">
        Priority delivery is a queue target of under two hours after payment, not a guarantee if safety review or a provider outage delays work. If we miss it by a full day, ask and we will refund the priority fee.
      </p>

      <h2 className="mt-8 text-2xl">How refunds are paid</h2>
      <p className="mt-3">
        Approved refunds are returned to your original payment method via Stripe. This usually takes 5–10 working days depending on your bank.
      </p>

      <p className="mt-8 text-sm text-cream/60">
        {APP_NAME} · See also <Link href="/shipping">shipping</Link> and <Link href="/terms">terms</Link>.
      </p>
    </main>
  );
}
