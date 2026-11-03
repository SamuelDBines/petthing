"use client";

import { useState } from "react";
import { Countdown } from "@/components/countdown";
import { storedUtm } from "@/components/utm-capture";
import { marketingConsentGranted, metaCheckoutAttribution, trackMetaEvent } from "@/lib/meta/client";

const TRUST_ITEMS = [
  "UK warehouse fulfilment on ready-made decor",
  "Tracked delivery. Typical 3–5 working days",
  "30-day returns on unused items",
  "Secure checkout powered by Stripe",
];

export function TrustRow() {
  return (
    <section className="border-y border-line bg-bark/80 py-8" aria-label="Why shop with us">
      <ul className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-muted">
            <span className="mt-0.5 text-pumpkin" aria-hidden>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowPersonalisedWorks() {
  const steps = [
    ["Upload", "Add a clear photo of your pet or family. Up to six angles."],
    ["Preview", "Pick a festive style and approve the artwork before you pay."],
    ["We print", "Prodigi or Printful fulfil in the UK with tracked delivery."],
    ["Hang it", "Your private link stays yours. Share only if you want to."],
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14">
      <h2 className="display text-3xl text-cream">How personalised orders work</h2>
      <p className="mt-2 max-w-2xl text-muted">No surprises. you see the artwork before checkout.</p>
      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], index) => (
          <li key={title} className="rounded-2xl border border-line bg-bark p-5">
            <p className="text-sm font-semibold text-pumpkin">Step {index + 1}</p>
            <h3 className="mt-2 display text-xl text-cream">{title}</h3>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ShopFaq({ items }: { items: [string, string][] }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-14">
      <h2 className="display text-3xl text-cream">Questions</h2>
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-bark">
        {items.map(([q, a]) => (
          <details key={q} className="group p-4">
            <summary className="cursor-pointer font-medium text-cream marker:content-none group-open:text-pumpkin">{q}</summary>
            <p className="mt-2 text-sm leading-6 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function EmailCapture({ storeName }: { storeName: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!consent) {
      setError("Please tick the box to hear from us by email.");
      return;
    }
    const meta = metaCheckoutAttribution();
    const leadEventId = trackMetaEvent("Lead") ?? meta.purchaseEventId;
    const response = await fetch("/api/marketing/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        marketingConsent: true,
        source: "newsletter",
        utm: storedUtm(),
        metaLeadEventId: leadEventId,
        metaMarketingConsent: marketingConsentGranted(),
        metaFbp: meta.fbp,
        metaFbc: meta.fbc,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not join the list.");
      return;
    }
    setNote("Thanks. We will only email about seasons and delivery windows.");
    setEmail("");
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="rounded-3xl border border-line bg-moss/10 px-6 py-10 sm:px-10">
        <h2 className="display text-2xl text-cream">Next season on your inbox</h2>
        <p className="mt-2 text-sm text-muted">Launch dates and cut-offs for {storeName}. No spam.</p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
          <label className="sr-only" htmlFor="shop-email">Email</label>
          <input
            id="shop-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field min-h-12 flex-1"
          />
          <button type="submit" className="min-h-12 rounded-full bg-pumpkin px-6 text-sm font-semibold text-white">
            Join the list
          </button>
        </form>
        <label className="mt-3 flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          Email me about launches and delivery windows for this store.
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      </div>
    </section>
  );
}

export function ChristmasCountdown({ deadlineIso, label }: { deadlineIso: string; label: string }) {
  return (
    <section className="bg-moss/15 py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm">
        <p className="font-medium text-cream">{label}</p>
        <Countdown deadlineIso={deadlineIso} label="Time left" />
      </div>
    </section>
  );
}

/** Hidden until real reviews exist — keeps layout without fake stars. */
export function ReviewsPlaceholder() {
  return (
    <section className="hidden" aria-hidden data-testid="reviews-placeholder">
      Reviews
    </section>
  );
}
