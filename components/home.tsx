"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL, TAGLINE } from "@/config/brand";
import { DIGITAL_PACK_PENCE, FREE_PREVIEWS_PER_EMAIL, formatGbp } from "@/config/pricing";
import { PREVIEW_STYLES } from "@/config/preview-styles";
import { Compare } from "@/components/compare";
import { PawtraitryHomeGiftsSection } from "@/components/pawtraitry-home-gifts-section";
import { trackMetaEvent } from "@/lib/meta/client";

const FAQS = [
  ["Is it really free to try?", "Yes. Upload a photo, add your email and make up to three watermarked previews for free. You only pay if you want the files or a gift."],
  ["How fast is it?", "Most previews appear in under a minute. Once you pay, your HD files are emailed straight away."],
  ["What makes a good photo?", "A clear face or a clear pet face, decent light, and no sunglasses. A few angles help. Up to six photos."],
  ["Are children allowed?", "Yes, with a parent’s permission. You confirm that on the form. Scenes stay fully clothed and family-friendly."],
  ["What if I don’t like them?", "We’ll regenerate free of charge. If you’re still unhappy, we’ll refund the portrait order."],
  ["Who can see the pictures?", "Only you, via a private link. We don’t publish a gallery. Share buttons use a watermarked preview."],
  ["When are files deleted?", "Unpaid previews are deleted after 48 hours. Paid orders: photos go 7 days after delivery, finished portraits after 30 days."],
  ["Do you print?", "Yes. Pick a preview and put it on a mug, print, canvas, puzzle and more, posted in the UK. The digital files come free with any gift."],
  [
    "Can I get my portrait on a mug or canvas?",
    "Yes. After your previews, choose Put it on a gift and add mugs, cushions, coasters, framed prints, canvas, puzzles or cards in one checkout. UK delivery is included in print prices.",
  ],
  ["What styles can I pick?", "Oil painting, watercolour, renaissance, royal, cartoon, pop art, sketch and line art, plus Halloween and Christmas looks. You can also describe your own idea or simply improve your photo."],
  ["Are the portraits real photos?", "No. They are AI-generated art styled from your uploads. We label them clearly on your gallery and in emails."],
];

export function HomePage() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    trackMetaEvent("ViewContent", { currency: "GBP", contentIds: ["portrait"] });
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => setPaused(Boolean(data.salesPaused)))
      .catch(() => undefined);
  }, []);

  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_.9fr] md:py-16">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Free to try. No card needed.</p>
          <h1 className="mt-5 text-5xl leading-[0.95] sm:text-7xl">A portrait your pet deserves.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">{TAGLINE} Upload a photo, pick a style and see {FREE_PREVIEWS_PER_EMAIL} free previews. Keep the files for {formatGbp(DIGITAL_PACK_PENCE)}, or put your favourite on a gift.</p>
          {paused ? (
            <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">Orders are paused while we catch up. Please check back soon.</p>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create" className="inline-flex min-h-12 items-center rounded-full bg-pumpkin px-6 text-sm font-medium text-ink" data-testid="home-cta">
                Try it free
              </Link>
              <Link href="#pricing" className="inline-flex min-h-12 items-center rounded-full border border-line px-6 text-sm font-medium">
                See prices
              </Link>
            </div>
          )}
          <p className="mt-4 text-sm text-muted">Made in the UK. No account needed. Only pay if you love it.</p>
        </div>
        <Compare before="/examples/pet-before.jpg" after="/examples/pet-after.jpg" label="A terrier, before and after" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-2">
        <Compare before="/examples/couple-before.jpg" after="/examples/couple-after.jpg" label="A couple, before and after" />
        <div className="rounded-2xl border border-line bg-bark p-6">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-4 space-y-4 text-muted">
            <li><strong className="text-cream">1. Upload your pet.</strong> One clear photo is all it takes.</li>
            <li><strong className="text-cream">2. Pick a style.</strong> Or describe your own, or just improve the photo.</li>
            <li><strong className="text-cream">3. See {FREE_PREVIEWS_PER_EMAIL} free previews.</strong> Watermarked, right here on screen.</li>
            <li><strong className="text-cream">4. Keep it.</strong> Digital pack for {formatGbp(DIGITAL_PACK_PENCE)}, or put it on a gift with the files included.</li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-4xl">Pick a style</h2>
        <p className="mt-2 max-w-2xl text-muted">Timeless looks all year, plus Halloween and Christmas. Original scenes only. No film characters, no brand logos, everyone fully clothed.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {PREVIEW_STYLES.map((style) => (
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

      <PawtraitryHomeGiftsSection />

      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-4xl">Simple pricing</h2>
        <p className="mt-2 max-w-2xl text-muted">Try first, pay only if you love it.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-bark p-6">
            <h3 className="text-3xl">Previews</h3>
            <p className="mt-2 text-3xl">Free</p>
            <p className="mt-2 text-muted">Up to {FREE_PREVIEWS_PER_EMAIL} watermarked previews per email. No card needed.</p>
          </article>
          <article className="rounded-2xl border border-cream/30 bg-bark p-6">
            <h3 className="text-3xl">Digital pack</h3>
            <p className="mt-2 text-3xl">{formatGbp(DIGITAL_PACK_PENCE)}</p>
            <p className="mt-2 text-muted">Your previews in HD, no watermark, emailed with a private download link.</p>
          </article>
          <article className="rounded-2xl border border-line bg-bark p-6">
            <h3 className="text-3xl">On a gift</h3>
            <p className="mt-2 text-3xl">Files included</p>
            <p className="mt-2 text-muted">Mugs, prints, canvas, puzzles and more. Pay for the gift and the digital files come free. UK delivery included.</p>
          </article>
        </div>
        <Link href="/create" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-pumpkin px-6 text-sm font-medium text-ink">
          Try it free
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-line bg-bark p-6">
          <h2 className="text-3xl">Trust and privacy</h2>
          <ul className="mt-4 space-y-2 text-muted">
            <li>Uploads and results sit in private storage. Links expire.</li>
            <li>Portraits are AI-generated from your photos and labelled as such. No public gallery, no training set.</li>
            <li>Unpaid previews are deleted after 48 hours. Paid photos go 7 days after delivery, results after 30 days.</li>
            <li>Nudity, sexual content, violence and gore are rejected. Family orders use stricter prompts.</li>
            <li>You confirm you have permission, including from parents where children are in the photos.</li>
          </ul>
        </div>
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
