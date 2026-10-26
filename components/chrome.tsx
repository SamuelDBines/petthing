import Link from "next/link";
import { APP_NAME } from "@/config/brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="display text-xl">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/#pricing" className="hidden sm:inline text-cream/80">
            This season
          </Link>
          <Link href="/#pass" className="text-cream/80">
            Season pass
          </Link>
          <Link href="/create" className="rounded-full bg-pumpkin px-4 py-2 font-semibold text-ink">
            Make mine
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-10 text-sm text-cream/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:justify-between">
        <p>© 2026 {APP_NAME}. Photos stay private to your order.</p>
        <p className="flex gap-4">
          <Link href="/refunds">Refunds</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/admin">Admin</Link>
        </p>
      </div>
    </footer>
  );
}
