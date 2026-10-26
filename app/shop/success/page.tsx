import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Order received</h1>
      <p className="mt-3 text-[var(--moss)]">Thanks — we’ll email when your bits are on the way.</p>
      <Link href="/" className="mt-8 inline-block rounded-full border px-5 py-2">
        Back to shop
      </Link>
    </main>
  );
}
