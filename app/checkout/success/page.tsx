import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessStatus } from "@/components/success-status";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Order confirmation",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
          <p className="text-muted">Loading your order…</p>
        </main>
      }
    >
      <SuccessStatus />
    </Suspense>
  );
}
