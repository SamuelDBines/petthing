import { Suspense } from "react";
import { PreviewWizard } from "@/components/preview-wizard";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-4 py-10">Loading the form...</main>}>
      <PreviewWizard />
    </Suspense>
  );
}
