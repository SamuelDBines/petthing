import { SUPPORT_EMAIL } from "@/config/brand";

export const metadata = { title: "Refunds" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Refunds</h1>
      <p className="mt-4">If a portrait doesn’t look like the person or pet in your photos, email {SUPPORT_EMAIL} and we’ll regenerate that style free of charge.</p>
      <p className="mt-3">If you’re still unhappy after a regenerate, we’ll refund the portrait payment. Printed orders that have already gone to press can’t be refunded unless they arrive damaged or wrong.</p>
      <p className="mt-3">Priority delivery is a queue target of under two hours after payment, not a promise if the safety review or a provider outage gets in the way. If we miss it by a day, ask and we’ll refund the priority fee.</p>
    </main>
  );
}
