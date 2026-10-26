import { Suspense } from "react";
import { SharePreview } from "@/components/share-preview";

async function Preview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharePreview token={token} />;
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-10">Loading the preview…</main>}>
      <Preview params={params} />
    </Suspense>
  );
}
