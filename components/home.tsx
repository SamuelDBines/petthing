"use client";

import { checkoutErrorMessage, parseCheckoutResponse } from "@/lib/checkout/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL, TAGLINE } from "@/config/brand";
import { CHRISTMAS_PREORDER_PENCE, formatGbp, SEASON_PASS, TIERS } from "@/config/pricing";
import { THEMES, type ThemeDefinition } from "@/config/themes";
import { Compare } from "@/components/compare";
import { Countdown } from "@/components/countdown";
import { trackMetaEvent } from "@/lib/meta/client";

const FAQS = [
  ["How fast is it?", "Standard orders are reviewed and emailed as they finish. Priority delivery is an under-two-hour target once payment clears and the queue is moving."],
  ["What makes a good photo?", "A clear face or a clear pet face, decent light, and no sunglasses. A few angles help. Up to six photos."],
  ["Are children allowed?", "Yes, with a parent’s permission. You confirm that on the form. Scenes stay fully clothed and family-friendly."],
  ["What if I don’t like them?", "We’ll regenerate free of charge. If you’re still unhappy, we’ll refund the portrait order."],
  ["Who can see the pictures?", "Only you, via a private link. We don’t publish a gallery. Share buttons use a watermarked preview."],
  ["When are files deleted?", "One-off photos go 7 days after delivery. A season pass keeps them for up to a year so the next season can use them. Finished portraits go after 30 days."],
  ["Do you print?", "Yes. When your gallery is ready you can order UK-posted prints and gifts. Puzzles, canvas, classic frames, mugs, and more. From the same portraits."],
  ["Is this only for one season?", "No. We run themed collections through the year. Pets and families stay at the heart of it. Christmas opens on 1 November, and more seasons follow the same way."],
  ["Are the portraits real photos?", "No. They are AI-generated art styled from your uploads. We label them clearly on your gallery and in emails."],
  ["What is the season pass?", "A yearly plan for a family or group. You get a Classic set each season, starting with the one that’s open. One-off orders stay available for pets, couples, and a single season."],
];

export function HomePage() {
  const [theme, setTheme] = useState<ThemeDefinition>(THEMES[0]);
  const [paused, setPaused] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    trackMetaEvent("ViewContent", { currency: "GBP", contentIds: ["portrait"] });
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (data.theme) setTheme(data.theme);
        setPaused(Boolean(data.salesPaused));
      })
      .catch(() => undefined);
  }, []);

  async function preorder(event: React.FormEvent) {
    event.preventDefault();
    setNote("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "christmas", email }),
    });
    const { ok, body: data } = await parseCheckoutResponse(response);
    if (!ok || !data.url) {
      setNote(checkoutErrorMessage(data, ok));
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_.9fr] md:py-16">
        <div>
          <Countdown deadlineIso={theme.deadlineIso} label={`${theme.name} is this season`} />
          <h1 className="mt-5 text-5xl leading-[0.95] sm:text-7xl">A portrait your pet deserves.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">{TAGLINE} {theme.name} styles are open now; Christmas arrives on 1 November.</p>
          {paused ? (
            <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">Orders are paused while we catch up. The next season is still open below.</p>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create" className="inline-flex min-h-12 items-center rounded-full bg-pumpkin px-6 text-sm font-medium text-ink">
                Order {theme.name} · from {formatGbp(TIERS[0].pricePence)}
              </Link>
              <Link href="/create?offer=season" className="inline-flex min-h-12 items-center rounded-full border border-line px-6 text-sm font-medium">
                Season pass · {formatGbp(SEASON_PASS.pricePence)}/year
              </Link>
            </div>
          )}
          <p className="mt-4 text-sm text-muted">Made in the UK. No account needed. Optional puzzle gift with UK postage.</p>
        </div>
        <Compare before="/examples/pet-before.jpg" after="/examples/pet-after.jpg" label="A terrier, before and after" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-2">
        <Compare before="/examples/couple-before.jpg" after="/examples/couple-after.jpg" label="A couple, before and after" />
        <div className="rounded-2xl border border-line bg-bark p-6">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-4 space-y-4 text-muted">
            <li><strong className="text-cream">1. Tell us who.</strong> Pet, family, couple, or just you.</li>
            <li><strong className="text-cream">2. Add up to six photos.</strong> We compress them on your phone.</li>
            <li><strong className="text-cream">3. Pick styles and pay.</strong> Classic is the one most people choose.</li>
            <li><strong className="text-cream">4. Get a private link.</strong> Download, share a watermark, or order prints.</li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-4xl">This season: {theme.name}</h2>
        <p className="mt-2 max-w-2xl text-muted">{theme.deadlineLabel}. Original scenes only. No film characters, no brand logos, everyone fully clothed. The next season gets its own set.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {theme.styles.map((style) => (
            <article key={style.id} className="overflow-hidden rounded-2xl border border-line bg-bark">
              {style.thumbnail ? (
                <img src={style.thumbnail} alt="" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="aspect-[4/5]" style={{ background: style.swatch }} />
              )}
              <div className="p-4">
                <h3 className="text-xl">{style.name}</h3>
                <p className="mt-1 text-sm text-muted">{style.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-4xl">Order {theme.name} once</h2>
        <p className="mt-2 max-w-2xl text-muted">Pet, family, couple, or just you. Pay once for this season.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article key={tier.id} className={`rounded-2xl border bg-bark p-6 ${tier.popular ? "order-first border-cream/30 md:order-none" : "border-line"}`}>
              <p className="min-h-4 text-[11px] tracking-[0.16em] text-muted uppercase">{tier.popular ? "Most popular" : ""}</p>
              <h3 className="mt-3 text-3xl">{tier.name}</h3>
              <p className="mt-2 text-3xl">{formatGbp(tier.pricePence)}</p>
              <p className="mt-2 text-muted">{tier.blurb}</p>
              <ul className="mt-4 space-y-1 text-sm">
                {tier.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Add priority delivery at checkout for {formatGbp(299)}. Add three more styles later for {formatGbp(499)}.</p>
      </section>

      <section id="pass" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid items-end gap-8 border-y border-line py-10 md:grid-cols-[1.3fr_.7fr]">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Alongside the one-offs</p>
            <h2 className="mt-3 text-4xl">A family set, every season</h2>
            <p className="mt-3 max-w-xl text-muted">{SEASON_PASS.blurb} {theme.name} starts now. Christmas opens on 1 November, and later seasons join the same pass.</p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {SEASON_PASS.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-4xl">{formatGbp(SEASON_PASS.pricePence)}<span className="text-lg text-muted"> / year</span></p>
            <p className="mt-2 text-sm text-muted">Renews once a year. The first set is {theme.name}.</p>
            <Link href="/create?offer=season" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-pumpkin px-5 text-sm font-medium text-ink">
              Start the family pass
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-bark p-6">
          <h2 className="text-3xl">Trust and privacy</h2>
          <ul className="mt-4 space-y-2 text-muted">
            <li>Uploads and results sit in private storage. Links expire.</li>
            <li>Portraits are AI-generated from your photos and labelled as such. No public gallery, no training set.</li>
            <li>One-off photos are deleted 7 days after delivery. A season pass keeps them for the next season. Results go after 30 days.</li>
            <li>Nudity, sexual content, violence and gore are rejected. Family orders use stricter prompts.</li>
            <li>You confirm you have permission, including from parents where children are in the photos.</li>
          </ul>
        </div>
        <form onSubmit={preorder} className="rounded-2xl border border-line bg-bark p-6">
          <h2 className="text-3xl">Next season: Christmas</h2>
          <p className="mt-2 text-muted">Opens 1 November. A season pass already includes it. Or pre-order just that set for {formatGbp(CHRISTMAS_PREORDER_PENCE)}.</p>
          <label className="mt-4 block text-sm" htmlFor="christmas-email">Email</label>
          <input id="christmas-email" className="field mt-1" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="mt-4 rounded-full bg-pumpkin px-5 py-3 text-sm font-medium text-ink" type="submit">Pre-order the next season</button>
          {note ? <p className="mt-3 text-sm">{note}</p> : null}
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-4xl">Questions</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {FAQS.map(([question, answer]) => (
            <details key={question} className="py-4">
              <summary className="cursor-pointer text-lg">{question}</summary>
              <p className="mt-2 max-w-3xl text-muted">{answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Questions: {SUPPORT_EMAIL}. {APP_NAME}.</p>
      </section>
    </main>
  );
}
