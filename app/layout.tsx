import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Fraunces, Outfit } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { UtmCapture } from "@/components/utm-capture";
import { VisitorTracker } from "@/components/visitor-tracker";
import { headers } from "next/headers";
import { loadStoreConfig, themeCssVars } from "@/lib/tenant/context";
import "./globals.css";

/** Store theme is chosen per request hostname — must not be statically prerendered. */
export const instant = false;

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

function stagingNoindex(host: string) {
  if (process.env.STAGING_NOINDEX === "1") return true;
  return host.includes("bishop-co-tech.co.uk") || host.includes("dropship.store.");
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadStoreConfig();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const base = `https://${config.brand.siteDomain}`;
  const noindex = stagingNoindex(host);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || base),
    title: { default: config.brand.appName, template: `%s · ${config.brand.appName}` },
    description: config.brand.tagline,
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      locale: "en_GB",
      siteName: config.brand.appName,
      title: config.brand.appName,
      description: config.brand.tagline,
    },
    twitter: {
      card: "summary_large_image",
      title: config.brand.appName,
      description: config.brand.tagline,
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await loadStoreConfig();
  const cssVars = themeCssVars(config.brand.colors);
  return (
    <html
      lang="en-GB"
      data-store={config.slug}
      style={cssVars}
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UtmCapture />
        <SiteHeader brand={config.brand} />
        <div className="flex-1">{children}</div>
        <SiteFooter brand={config.brand} />
        <Suspense fallback={null}>
          <VisitorTracker />
        </Suspense>
        <CookieBanner />
      </body>
    </html>
  );
}
