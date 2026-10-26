import { Suspense } from "react";
import { CreateWizard } from "@/components/create-wizard";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-4 py-10">Loading the form…</main>}>
      <CreateWizard />
    </Suspense>
  );
}
