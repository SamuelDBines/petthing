"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGbp } from "@/config/pricing";

export function AdminCustomerDetailClient({ personKey }: { personKey: string }) {
  const [detail, setDetail] = useState<{
    email: string;
    name: string | null;
    status: string;
    orders: { id: string; kind: string; storeId: string; status: string; paidPence: number; createdAt: string }[];
    timeline: { at: string; type: string; detail: string; storeId: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDetail(null);
      setError("");
      const encoded = encodeURIComponent(personKey);
      const response = await fetch(`/api/admin/customers/${encoded}`);
      if (cancelled) return;
      if (!response.ok) {
        setError(response.status === 404 ? "Person not found." : "Could not load person.");
        return;
      }
      setDetail(await response.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [personKey]);

  async function load() {
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(personKey)}`);
    if (!response.ok) return;
    setDetail(await response.json());
  }

  async function action(kind: "unsubscribe" | "anonymize") {
    if (kind === "anonymize" && !window.confirm("Anonymise this person across orders and sign-ups?")) return;
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(personKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: kind }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(body.ok ? "Done." : body.error || "Failed");
    await load();
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin" className="text-sm text-cream/60">← Admin</Link>
        <p className="mt-6 text-sm text-danger">{error}</p>
      </main>
    );
  }

  if (!detail) return <main className="mx-auto max-w-3xl px-4 py-10">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-cream/60">← Admin</Link>
      <h1 className="mt-4 text-3xl">{detail.email}</h1>
      <p className="mt-2 text-sm text-cream/60">{detail.name ?? "No name"} · {detail.status.replaceAll("_", " ")}</p>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => void action("unsubscribe")}>Unsubscribe</button>
        <button type="button" className="rounded-full border border-line border-danger px-4 py-2 text-sm text-danger" onClick={() => void action("anonymize")}>Anonymise</button>
      </div>
      <h2 className="mt-8 text-2xl">Orders</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {detail.orders.map((order) => (
          <li key={order.id} className="rounded-2xl border border-line p-3">
            {order.kind} · {order.storeId} · {order.status} · {formatGbp(order.paidPence)} · {order.createdAt.slice(0, 10)}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-2xl">Timeline</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {detail.timeline.map((event) => (
          <li key={`${event.at}-${event.type}-${event.detail}`} className="rounded-2xl border border-line p-3">
            {event.at.slice(0, 19)} · {event.type} · {event.detail} ({event.storeId})
          </li>
        ))}
      </ul>
    </main>
  );
}
