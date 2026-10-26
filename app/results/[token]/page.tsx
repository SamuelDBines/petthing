import { Suspense } from "react";
import { ResultsGallery } from "@/components/results-gallery";

async function Gallery({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResultsGallery token={token} />;
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-10">Loading your gallery…</main>}>
      <Gallery params={params} />
    </Suspense>
  );
}
