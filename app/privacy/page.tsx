import Link from "next/link";
import { loadStoreConfig, requestStoreId } from "@/lib/tenant/context";
import { LEGAL_COMPANY_NAME } from "@/config/brand";
import { legalCopyForStore, legalWhoWeAre } from "@/lib/legal/store-legal";

export const metadata = { title: "Privacy" };

export default async function Page() {
  const storeId = await requestStoreId();
  const config = await loadStoreConfig(storeId);
  const copy = legalCopyForStore(config);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Privacy</h1>
      <p className="mt-4 text-sm text-cream/60">Last updated: 28 October 2026</p>
      <p className="mt-6">
        {legalWhoWeAre(copy)} {copy.appName} is the data controller for personal data collected through this website.
      </p>
      <h2 className="mt-8 text-2xl">What we collect</h2>
      <p className="mt-3">
        We collect contact details, order information, payment references (via Stripe), delivery addresses for physical goods, photos you upload for personalised products, and technical data such as cookies and analytics when you consent.
      </p>
      <h2 className="mt-8 text-2xl">How we use data</h2>
      <p className="mt-3">
        To fulfil orders, provide customer support, prevent fraud, and improve the site. We do not sell your personal data. Fulfillment partners (such as Go Dropship, Prodigi, or print partners) receive only what they need to ship your order.
      </p>
      <h2 className="mt-8 text-2xl">Cookies and advertising</h2>
      <p className="mt-3">
        With your consent, we use Meta (Facebook/Instagram) Pixel and Conversions API to measure ad performance and attribute purchases. Meta may set cookies such as{" "}
        <code className="text-sm">_fbp</code> and <code className="text-sm">_fbc</code> when you accept marketing cookies. We do not load the pixel or set those cookies until you choose{" "}
        <strong>Accept all</strong> on the cookie banner. If you reject marketing cookies, we still run essential checkout and security features without Meta tracking.
      </p>
      <p className="mt-3">
        Server-side events are only sent when you have accepted marketing cookies, and include hashed contact details, browser identifiers, and order value in GBP. You can change your choice anytime by clearing site data or using the banner when it reappears.
      </p>
      <h2 className="mt-8 text-2xl">Your rights</h2>
      <p className="mt-3">
        You may request access, correction, or deletion of your data, and object to marketing. Contact{" "}
        <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a>. You may also complain to the ICO.
      </p>
      <p className="mt-6 text-sm text-cream/60">
        {LEGAL_COMPANY_NAME} · See also <Link href="/terms">terms</Link> and <Link href="/refunds">returns</Link>.
      </p>
    </main>
  );
}
