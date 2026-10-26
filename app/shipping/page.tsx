import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/brand";
import { formatGbp } from "@/config/pricing";
import { PRINTS } from "@/config/prints";

const puzzle = PRINTS.find((item) => item.id === "puzzle_252");

export const metadata = { title: "Shipping" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Shipping</h1>

      <h2 className="mt-8 text-2xl">Digital portraits</h2>
      <p className="mt-3">
        {APP_NAME} portraits are delivered by email and a private online gallery. No physical shipping applies to the digital product. You will receive a link when your order has passed review (if manual review is enabled) and generation is complete.
      </p>

      <h2 className="mt-8 text-2xl">Printed puzzles (UK only)</h2>
      <p className="mt-3">
        We offer a {puzzle?.name ?? "252-piece jigsaw puzzle"} posted to UK addresses only. The price shown at checkout ({puzzle ? formatGbp(puzzle.pricePence) : "see product page"}) includes standard UK delivery unless we state otherwise at the time of order.
      </p>
      <p className="mt-3">
        Prints are produced by our UK print partner (Prodigi) after you pay. We collect your shipping address in Stripe Checkout. Production typically takes a few working days; Royal Mail standard delivery adds further time. We do not currently ship prints outside the United Kingdom.
      </p>

      <h2 className="mt-8 text-2xl">Tracking and problems</h2>
      <p className="mt-3">
        If a parcel is delayed, damaged, or missing, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order email and we will help you with a replacement or refund in line with our{" "}
        <Link href="/refunds">returns &amp; refunds</Link> policy.
      </p>
    </main>
  );
}
