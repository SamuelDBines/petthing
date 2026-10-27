import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartDrawer } from "@/components/shop/cart-drawer";
import type { StoreBrand } from "@/lib/tenant/types";
import type { StoreType } from "@/lib/tenant/types";

type Props = {
  brand: StoreBrand;
  storeId: string;
  storeType: StoreType;
};

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-cream/85 hover:text-cream">
      {children}
    </Link>
  );
}

export function ShopSiteHeader({ brand, storeId, storeType }: Props) {
  const nav =
    storeType === "christmas"
      ? [
          { href: "/#personalised", label: "Personalised" },
          { href: "/#tree", label: "Tree" },
          { href: "/#home-door", label: "Home & door" },
          { href: "/#gifts", label: "Gifts" },
          { href: "/#faq", label: "FAQ" },
        ]
      : [
          { href: "/#door", label: "Door & draughts" },
          { href: "/#car", label: "Car" },
          { href: "/#garden", label: "Garden" },
          { href: "/#kits", label: "Kits" },
          { href: "/#faq", label: "FAQ" },
        ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="display flex items-center gap-2 text-xl text-cream">
          <Image src={brand.logoPath} alt="" width={32} height={32} className="rounded-lg" />
          {brand.appName}
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
          ))}
        </nav>
        <CartDrawer storeId={storeId} />
      </div>
    </header>
  );
}

export function ShopSiteFooter({ brand }: { brand: StoreBrand }) {
  return (
    <footer className="border-t border-line px-4 py-10 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <p className="max-w-3xl leading-6 text-muted">{brand.footerTradingDisclosure}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <p className="text-muted">© 2026 {brand.appName}. Prices include UK VAT where applicable.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/terms" className="text-muted hover:text-cream">Terms</Link>
            <Link href="/privacy" className="text-muted hover:text-cream">Privacy</Link>
            <Link href="/refunds" className="text-muted hover:text-cream">Returns &amp; refunds</Link>
            <Link href="/shipping" className="text-muted hover:text-cream">Shipping</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
