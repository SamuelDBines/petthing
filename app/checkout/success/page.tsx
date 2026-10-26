import { Suspense } from "react";
import { SuccessStatus } from "@/components/success-status";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-4 py-10">Checking your payment…</main>}>
      <SuccessStatus />
    </Suspense>
  );
}
