import Image from "next/image";
import Link from "next/link";
import { APP_NAME, FOOTER_TRADING_DISCLOSURE } from "@/config/brand";
import type { StoreBrand } from "@/lib/tenant/types";

type BrandProps = { brand?: StoreBrand };

export function SiteHeader({ brand }: BrandProps) {
  const name = brand?.appName ?? APP_NAME;
  const logo = brand?.logoPath ?? "/logo.svg";
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="display flex items-center gap-2 text-xl">
          <Image src={logo} alt="" width={32} height={32} className="rounded-lg" />
          {name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/#pricing" className="hidden sm:inline text-cream/80">
            Pricing
          </Link>
          <Link href="/#pass" className="text-cream/80">
            Season pass
          </Link>
          <Link href="/create" className="rounded-full bg-pumpkin px-4 py-2 font-semibold text-ink">
            Create yours
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ brand }: BrandProps) {
  const name = brand?.appName ?? APP_NAME;
  const disclosure = brand?.footerTradingDisclosure ?? FOOTER_TRADING_DISCLOSURE;
  return (
    <footer className="border-t border-line px-4 py-10 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <p className="max-w-3xl leading-6 text-muted">{disclosure}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <p>© 2026 {name}. Your photos stay private to your order.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {brand?.supportEmail ? (
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
            ) : null}
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Returns &amp; refunds</Link>
            <Link href="/shipping">Shipping</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
