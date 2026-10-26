import Link from "next/link";
import {
  APP_NAME,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_NUMBER,
  LEGAL_REGISTERED_OFFICE,
  LEGAL_TRADING_NAME,
  SUPPORT_EMAIL,
} from "@/config/brand";

export const metadata = { title: "Privacy" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Privacy policy</h1>
      <p className="mt-4 text-sm text-cream/60">UK GDPR · Last updated: 26 October 2026</p>

      <h2 className="mt-8 text-2xl">Controller</h2>
      <p className="mt-3">
        {LEGAL_TRADING_NAME} ({APP_NAME}) is a trading name of {LEGAL_COMPANY_NAME} (company number {LEGAL_COMPANY_NUMBER}), {LEGAL_REGISTERED_OFFICE}. For privacy questions contact{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2 className="mt-8 text-2xl">What we collect</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>Email address and order details (tier, styles, payment references from Stripe).</li>
        <li>Photos you upload to create portraits.</li>
        <li>Generated portrait files and watermarked previews.</li>
        <li>Shipping name and address for printed orders (collected by Stripe).</li>
        <li>Technical data: hashed IP for rate limiting, cookie choices, and optional UTM campaign tags.</li>
      </ul>

      <h2 className="mt-8 text-2xl">Why we use it (lawful bases)</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><strong>Contract</strong> — to create and deliver your portraits and any prints you order.</li>
        <li><strong>Legitimate interests</strong> — fraud prevention, service security, and improving the site (balanced against your rights).</li>
        <li><strong>Consent</strong> — marketing pixels (Meta, TikTok) only after you accept cookies; you can refuse non-essential cookies.</li>
        <li><strong>Legal obligation</strong> — tax and accounting records where required.</li>
      </ul>

      <h2 className="mt-8 text-2xl">Processors</h2>
      <p className="mt-3">
        We use trusted providers: Stripe (payments), Resend (email), fal.ai (AI image generation), Prodigi (UK printing), and our database/hosting provider. They process data only on our instructions and under appropriate contracts.
      </p>

      <h2 className="mt-8 text-2xl">AI and your photos</h2>
      <p className="mt-3">
        Photos are sent to our image provider to generate portraits. We do not use your photos to train public AI models or to build advertising profiles. Outputs are labelled as AI-generated. We run automated safety checks and may manually review orders before delivery.
      </p>

      <h2 className="mt-8 text-2xl">Retention</h2>
      <p className="mt-3">
        Uploaded photos from one-off orders are deleted 7 days after digital delivery. Season pass photos may be kept up to a year so the next season can reuse them. Finished portraits are deleted 30 days after delivery unless we need longer for a support issue. Unpaid drafts are removed after 48 hours.
      </p>

      <h2 className="mt-8 text-2xl">Your rights</h2>
      <p className="mt-3">
        You have rights to access, rectify, erase, restrict, object, and port your data where applicable. You may complain to the Information Commissioner&apos;s Office (ico.org.uk). To exercise rights, email {SUPPORT_EMAIL}.
      </p>

      <h2 className="mt-8 text-2xl">International transfers</h2>
      <p className="mt-3">
        Some providers may process data outside the UK. Where they do, we rely on appropriate safeguards such as UK adequacy regulations or standard contractual clauses.
      </p>

      <p className="mt-8 text-sm text-cream/60">
        See also <Link href="/terms">terms</Link> and <Link href="/refunds">returns &amp; refunds</Link>.
      </p>
    </main>
  );
}
