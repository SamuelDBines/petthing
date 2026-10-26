import Link from "next/link";
import {
  APP_NAME,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_NUMBER,
  LEGAL_REGISTERED_OFFICE,
  LEGAL_TRADING_NAME,
  SUPPORT_EMAIL,
} from "@/config/brand";

export const metadata = { title: "Terms of use" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Terms of use</h1>
      <p className="mt-4 text-sm text-cream/60">Last updated: 26 October 2026</p>

      <h2 className="mt-8 text-2xl">Who we are</h2>
      <p className="mt-3">
        {LEGAL_TRADING_NAME} ({APP_NAME}) is a trading name of {LEGAL_COMPANY_NAME}, a company registered in England and Wales (company number {LEGAL_COMPANY_NUMBER}), whose registered office is {LEGAL_REGISTERED_OFFICE}. Contact:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2 className="mt-8 text-2xl">What we sell</h2>
      <p className="mt-3">
        We sell personalised digital pet portraits (and optional printed goods such as jigsaw puzzles) created with AI from photos you upload. Portraits are decorative gifts; they are not photographs and are labelled as AI-generated.
      </p>

      <h2 className="mt-8 text-2xl">Your photos and permission</h2>
      <p className="mt-3">
        You must own the photos you upload or have permission from everyone shown, including a parent or guardian for children. You confirm this at checkout. We may reject uploads that break our content rules or cannot be used safely.
      </p>

      <h2 className="mt-8 text-2xl">Ordering and payment</h2>
      <p className="mt-3">
        Prices are shown in GBP and include UK VAT where applicable. Payment is processed by Stripe. A contract is formed when we accept your payment. Digital portraits are supplied by email and private download link once they are ready.
      </p>

      <h2 className="mt-8 text-2xl">Digital content and cancellation</h2>
      <p className="mt-3">
        For digital portraits you agree to immediate supply at checkout and acknowledge that you lose your 14-day right to cancel under the Consumer Contracts Regulations 2013 once delivery of the digital content begins. See our{" "}
        <Link href="/refunds">returns &amp; refunds</Link> page for faulty digital goods and quality issues.
      </p>

      <h2 className="mt-8 text-2xl">Printed goods</h2>
      <p className="mt-3">
        Printed items are made to your specification and are subject to separate cancellation rules. Delivery terms are in our <Link href="/shipping">shipping</Link> page.
      </p>

      <h2 className="mt-8 text-2xl">Acceptable use</h2>
      <p className="mt-3">
        Do not upload illegal, abusive, or sexual content. We do not use your photos to train public models or to advertise to others. See <Link href="/privacy">privacy</Link> for how we handle data.
      </p>

      <h2 className="mt-8 text-2xl">Liability</h2>
      <p className="mt-3">
        Nothing in these terms limits your statutory rights as a consumer. We are not liable for indirect loss. Our total liability for any order is limited to the amount you paid for that order, except where the law does not allow that limit.
      </p>

      <h2 className="mt-8 text-2xl">Law</h2>
      <p className="mt-3">
        These terms are governed by the laws of England and Wales. Courts in England and Wales have exclusive jurisdiction, without affecting mandatory consumer protections in your home country if you live elsewhere in the UK.
      </p>
    </main>
  );
}
