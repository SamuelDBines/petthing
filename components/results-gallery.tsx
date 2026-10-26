"use client";

import { useEffect, useState } from "react";
import { AI_GENERATED_LABEL, APP_NAME } from "@/config/brand";
import { formatGbp } from "@/config/pricing";
import { CardBuilder } from "@/components/card-builder";

type ImageRow = { id: string; styleId: string | null; styleName: string; url: string; previewUrl: string | null };
type Gallery = {
  ready: boolean;
  status?: string;
  order?: {
    tierName: string;
    includesCard: boolean;
    cardNames: string;
    themeName: string;
    referralCode: string;
    email: string;
  };
  images?: ImageRow[];
  prints?: { id: string; product: string; status: string; error: string | null }[];
  offers?: {
    extra: { pricePence: number; count: number; remaining: { id: string; name: string }[]; bonusImages: boolean };
    prints: { id: "puzzle_252"; name: string; detail: string; pricePence: number }[];
    christmasPence: number;
  };
};

export function ResultsGallery({ token }: { token: string }) {
  const [data, setData] = useState<Gallery | null>(null);
  const [error, setError] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [assetId, setAssetId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/results/${token}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Not found");
      return;
    }
    setData(body);
    if (body.images?.[0]) setAssetId(body.images[0].id);
  }

  useEffect(() => {
    const timer = window.setInterval(load, 8000);
    void load();
    return () => window.clearInterval(timer);
    // load is recreated each render; the interval only needs the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function checkout(payload: object) {
    setMessage("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not start checkout");
      return;
    }
    window.location.href = body.url;
  }

  if (error) return <main className="mx-auto max-w-3xl px-4 py-10"><p>{error}</p></main>;
  if (!data) return <main className="mx-auto max-w-3xl px-4 py-10">Loading your gallery…</main>;
  if (!data.ready || !data.order || !data.images || !data.offers) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-4xl">We’re still painting</h1>
        <p className="mt-3 text-cream/75">Status: {data.status}. This page updates on its own. If you’re on the local demo, open the success page and run generation, then refresh.</p>
      </main>
    );
  }

  function shareUrl() {
    return `${window.location.origin}/share/${token}`;
  }
  const needed = data.offers.extra.bonusImages ? data.offers.extra.count : Math.min(data.offers.extra.count, data.offers.extra.remaining.length || data.offers.extra.count);

  function toggle(id: string) {
    setExtra((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= needed) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  const styleChoices = data.offers.extra.bonusImages
    ? data.images.map((image) => ({ id: image.styleId || image.id, name: image.styleName }))
    : data.offers.extra.remaining;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-4xl">{data.order.themeName} portraits</h1>
      <p className="mt-2 text-cream/75">{data.order.tierName} set for {data.order.email}. Download before the 30-day deletion.</p>
      <p className="mt-2 text-sm text-cream/60">{AI_GENERATED_LABEL}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {data.images.map((image) => (
          <figure key={image.id} className="overflow-hidden rounded-3xl border border-line">
            <img src={image.url} alt={image.styleName} className="aspect-[3/4] w-full object-cover" />
            <figcaption className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>{image.styleName}</span>
              <a href={image.url}>Download</a>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink" href={`/api/results/${token}/zip`}>Download ZIP</a>
        <button className="rounded-full border border-line px-4 py-3" onClick={() => navigator.clipboard.writeText(shareUrl())}>Copy preview link</button>
        <a className="rounded-full border border-line px-4 py-3" href={`https://wa.me/?text=${encodeURIComponent(`${APP_NAME} portraits`)}`} onClick={(event) => { event.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(`${APP_NAME} ${shareUrl()}`)}`, "_blank"); }}>WhatsApp</a>
        <button className="rounded-full border border-line px-4 py-3" onClick={() => navigator.share?.({ title: APP_NAME, url: shareUrl() })}>Share</button>
      </div>
      <p className="mt-3 text-sm text-cream/60">Share buttons use a watermarked preview. The ZIP is the full set.</p>

      <section className="mt-8 rounded-[2rem] border border-gold/40 p-5">
        <h2 className="text-3xl">Your code: {data.order.referralCode}</h2>
        <p className="mt-2 text-cream/75">Friends get 20% off. When one of them is delivered, you get a free extra style.</p>
      </section>

      {message ? <p className="mt-4 text-sm">{message}</p> : null}

      <section className="mt-6 rounded-[2rem] border border-line p-5">
        <h2 className="text-3xl">{data.offers.extra.bonusImages ? "Add more images" : "Add 3 more styles"} · {formatGbp(data.offers.extra.pricePence)}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {styleChoices.filter((style, index, list) => list.findIndex((item) => item.id === style.id) === index).map((style) => (
            <button key={style.id} className={`rounded-full border px-3 py-2 text-sm ${extra.includes(style.id) ? "border-pumpkin" : "border-line"}`} onClick={() => toggle(style.id)}>{style.name}</button>
          ))}
        </div>
        <button className="mt-4 rounded-full bg-cream px-4 py-3 font-semibold text-ink disabled:opacity-40" disabled={extra.length !== needed || needed === 0} onClick={() => checkout({ kind: "extra_styles", token, styleIds: extra })}>
          Add them
        </button>
      </section>

      <section className="mt-6 rounded-[2rem] border border-line p-5">
        <h2 className="text-3xl">Prints &amp; canvas, posted in the UK</h2>
        <label className="mt-3 block text-sm">Portrait for the puzzle
          <select className="field mt-1" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            {data.images.map((image) => <option key={image.id} value={image.id}>{image.styleName}</option>)}
          </select>
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.offers.prints.map((product) => (
            <button key={product.id} className="rounded-3xl border border-line p-4 text-left" onClick={() => checkout({ kind: "print", token, productId: product.id, assetId })}>
              <span className="block text-xl">{product.name}</span>
              <span className="mt-1 block text-sm text-cream/70">{product.detail}</span>
              <span className="mt-2 block font-semibold">{formatGbp(product.pricePence)}</span>
            </button>
          ))}
        </div>
        <ul className="mt-3 text-sm text-cream/70">
          {data.prints?.map((print) => <li key={print.id}>{print.product}: {print.status}{print.error ? ` — ${print.error}` : ""}</li>)}
        </ul>
      </section>

      <form className="mt-6 rounded-[2rem] bg-moss p-5" onSubmit={(event) => { event.preventDefault(); checkout({ kind: "christmas", email: data.order?.email, token }); }}>
        <h2 className="text-3xl">Christmas pre-order · {formatGbp(data.offers.christmasPence)}</h2>
        <button className="mt-3 rounded-full bg-pumpkin px-4 py-3 text-sm font-medium text-ink" type="submit">Get the Christmas version on 1 November</button>
      </form>

      {data.order.includesCard ? <div className="mt-6"><CardBuilder images={data.images} defaultMessage={data.order.cardNames} /></div> : null}
    </main>
  );
}
