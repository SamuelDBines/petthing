"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { checkoutErrorMessage, parseCheckoutResponse } from "@/lib/checkout/client";
import { DIGITAL_SUPPLY_CONSENT_LABEL, PHOTO_CONSENT_LABEL } from "@/config/brand";
import { DIGITAL_INCLUDED_TIER, DIGITAL_PACK_PENCE, FREE_PREVIEWS_PER_EMAIL, formatGbp } from "@/config/pricing";
import { CUSTOM_STYLE_ID, PREVIEW_STYLES, type PreviewStyle } from "@/config/preview-styles";
import { storedUtm } from "@/components/utm-capture";
import { metaAttributionRequestBody } from "@/lib/meta/api-schema";
import { metaCheckoutAttribution } from "@/lib/meta/client";
import { PawtraitryCreateBasketStep } from "@/components/pawtraitry-create-basket-step";
import type { PawtraitryPhysicalBasketLine } from "@/lib/pawtraitry/create-basket";

const SESSION_KEY = "pawtraitry-preview-session";

type Session = { orderId: string; uploadToken: string; email: string };
type Preview = {
  jobId: string;
  assetId: string | null;
  styleId: string;
  styleName: string;
  prompt: string | null;
  status: "ready" | "working" | "failed";
  previewUrl: string | null;
};
type Status = { status: string; waitingForCredit: boolean; previewsLeft: number; previews: Preview[] };

async function prepare(file: File) {
  let blob: Blob = file;
  const heic = /hei[cf]$/i.test(file.name) || file.type.includes("heic") || file.type.includes("heif");
  if (heic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }
  const imageCompression = (await import("browser-image-compression")).default;
  return imageCompression(new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }), {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || "Something went wrong");
  return body as T;
}

const GROUPS: { id: "timeless" | "seasonal" | "yours"; title: string }[] = [
  { id: "timeless", title: "Timeless styles" },
  { id: "seasonal", title: "Seasonal" },
  { id: "yours", title: "Your idea" },
];

export function PreviewWizard() {
  const params = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [styleId, setStyleId] = useState<string>(PREVIEW_STYLES[0]!.id);
  const [customPrompt, setCustomPrompt] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [path, setPath] = useState<"choose" | "physical">("choose");
  const [physical, setPhysical] = useState<PawtraitryPhysicalBasketLine[]>([]);
  const [supplyConsent, setSupplyConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume after a cancelled checkout or a refresh, so previews are never lost.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (raw) setSession(JSON.parse(raw) as Session);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const refresh = useCallback(async (current: Session) => {
    const res = await fetch(`/api/previews?orderId=${current.orderId}&uploadToken=${encodeURIComponent(current.uploadToken)}`);
    if (res.status === 404) {
      window.localStorage.removeItem(SESSION_KEY);
      setSession(null);
      return null;
    }
    const next = await json<Status>(res);
    setStatus(next);
    setChosen((prev) => prev ?? [...next.previews].reverse().find((p) => p.status === "ready")?.assetId ?? null);
    return next;
  }, []);

  useEffect(() => {
    if (!session) return;
    let stop = false;
    const tick = async () => {
      try {
        const next = await refresh(session);
        if (!stop && next && next.previews.some((p) => p.status === "working")) {
          pollRef.current = setTimeout(tick, 3000);
        }
      } catch (reason) {
        if (!stop) setError(reason instanceof Error ? reason.message : "Could not load previews");
      }
    };
    void tick();
    return () => {
      stop = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [session, refresh, status?.previews.length]);

  function pickFile(next: File | null) {
    setFile(next);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(next ? URL.createObjectURL(next) : null);
  }

  async function start() {
    if (!file) return setError("Add a photo of your pet first.");
    if (!consent) return setError("Please confirm you can use this photo.");
    setBusy(true);
    setError("");
    try {
      const created = await json<{ orderId: string; uploadToken: string; previewsLeft: number }>(
        await fetch("/api/previews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, subjectType: "pet", photoConsent: true, utm: storedUtm() }),
        }),
      );
      const body = new FormData();
      body.set("orderId", created.orderId);
      body.set("uploadToken", created.uploadToken);
      body.set("file", await prepare(file));
      await json(await fetch("/api/uploads", { method: "POST", body }));
      const next = { orderId: created.orderId, uploadToken: created.uploadToken, email };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!session) return;
    if (styleId === CUSTOM_STYLE_ID && customPrompt.trim().length < 3) return setError("Describe the picture you want.");
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch("/api/previews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: session.orderId,
            uploadToken: session.uploadToken,
            styleId,
            customPrompt: styleId === CUSTOM_STYLE_ID ? customPrompt : undefined,
          }),
        }),
      );
      setChosen(null);
      await refresh(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(kind: "digital" | "physical") {
    if (!session || !chosen) return;
    if (!supplyConsent) return setError("Please tick the digital delivery box above to continue.");
    if (kind === "physical" && !physical.length) return setError("Choose at least one product.");
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch("/api/previews", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: session.orderId,
            uploadToken: session.uploadToken,
            path: kind,
            chosenAssetId: chosen,
            digitalSupplyConsent: true,
            physicalLines: kind === "physical" ? physical : undefined,
          }),
        }),
      );
      const meta = metaCheckoutAttribution();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "portrait",
          orderId: session.orderId,
          uploadToken: session.uploadToken,
          analyticsSessionId: (await import("@/components/visitor-tracker")).analyticsSessionId(),
          ...metaAttributionRequestBody(meta),
        }),
      });
      const { ok, body } = await parseCheckoutResponse(res);
      if (!ok || !body.url) throw new Error(checkoutErrorMessage(body, ok));
      window.localStorage.removeItem(SESSION_KEY);
      window.location.href = body.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
      setBusy(false);
    }
  }

  function startOver() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStatus(null);
    setChosen(null);
    setPath("choose");
    pickFile(null);
  }

  const previews = status?.previews ?? [];
  const ready = previews.filter((p) => p.status === "ready");
  const working = previews.some((p) => p.status === "working");
  const left = status ? Math.min(status.previewsLeft, FREE_PREVIEWS_PER_EMAIL - previews.length) : FREE_PREVIEWS_PER_EMAIL;
  const canGenerate = Boolean(session) && !working && left > 0 && status?.status !== "paid";

  const errorBox = error ? (
    <p className="mt-4 rounded-2xl border border-pumpkin/60 p-3 text-sm" role="alert">
      {error}
    </p>
  ) : null;

  if (path === "physical" && session && chosen) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8" data-testid="preview-wizard">
        <h1 className="text-3xl">Put it on something</h1>
        {errorBox}
        <PawtraitryCreateBasketStep
          tierId={DIGITAL_INCLUDED_TIER.id}
          onTierId={() => undefined}
          physical={physical}
          onPhysical={setPhysical}
          priority={false}
          onPriority={() => undefined}
          styleCount={1}
          requiredStyles={1}
          tierOverride={DIGITAL_INCLUDED_TIER}
          intro="Pick your products. Your HD digital files are included free with any physical order. UK delivery is included in each price."
          continueLabel={busy ? "Opening checkout..." : "Checkout"}
          continueDisabled={busy || !physical.length}
          onBack={() => setPath("choose")}
          onContinue={() => void checkout("physical")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" data-testid="preview-wizard">
      {params.get("cancelled") ? <p className="mb-4 rounded-2xl border border-line p-3 text-sm">Checkout cancelled. Your previews are still here.</p> : null}
      <h1 className="text-4xl">Try it free</h1>
      <p className="mt-2 text-cream/75">
        Upload your pet, pick a style and see up to {FREE_PREVIEWS_PER_EMAIL} free previews. Only pay if you love it.
      </p>

      {!session ? (
        <section className="mt-6 space-y-5">
          <label className="block rounded-3xl border border-dashed border-line p-5 text-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Your photo" className="mx-auto max-h-64 rounded-2xl" />
            ) : (
              <span className="block py-6">
                <span className="text-lg">1. Add a photo of your pet</span>
                <span className="mt-1 block text-sm text-muted">Clear, well lit, face visible. JPG, PNG or HEIC.</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="sr-only"
              data-testid="photo-input"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
            {photoUrl ? <span className="mt-2 block text-sm text-muted">Tap to change</span> : null}
          </label>
          <label className="block">
            <span className="text-lg">2. Where should we send your previews?</span>
            <input
              className="field mt-2 w-full"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              data-testid="preview-email"
            />
          </label>
          <label className="flex gap-3 text-sm leading-6">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} data-testid="photo-consent" />
            {PHOTO_CONSENT_LABEL}
          </label>
          {errorBox}
          <button
            type="button"
            className="w-full rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink disabled:opacity-50"
            disabled={busy || !file || !email || !consent}
            onClick={() => void start()}
            data-testid="preview-start"
          >
            {busy ? "Uploading..." : "Continue"}
          </button>
        </section>
      ) : (
        <>
          {canGenerate || (!ready.length && !working) ? (
            <section className="mt-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-2xl">Pick a style</h2>
                <span className="text-sm text-muted" data-testid="previews-left">
                  {left} free preview{left === 1 ? "" : "s"} left
                </span>
              </div>
              {GROUPS.map((group) => (
                <div key={group.id} className="mt-4">
                  <h3 className="text-sm uppercase tracking-wide text-muted">{group.title}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PREVIEW_STYLES.filter((s) => s.group === group.id).map((style) => {
                      const selected = styleId === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setStyleId(style.id)}
                          aria-pressed={selected}
                          className={`group relative overflow-hidden rounded-xl border bg-bark text-left transition ${selected ? "border-pumpkin ring-2 ring-pumpkin" : "border-line hover:border-cream/40"}`}
                          data-testid={`style-${style.id}`}
                        >
                          <StyleThumb style={style} />
                          {selected ? (
                            <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-pumpkin text-xs font-bold text-ink" aria-hidden>
                              ✓
                            </span>
                          ) : null}
                          <span className="block px-2.5 pb-2.5 pt-2">
                            <span className="block text-sm font-medium leading-tight">{style.name}</span>
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-cream/60">{style.blurb}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {styleId === CUSTOM_STYLE_ID ? (
                <label className="mt-4 block">
                  <span className="text-sm">Describe your picture</span>
                  <input
                    className="field mt-1 w-full"
                    maxLength={200}
                    value={customPrompt}
                    placeholder="My dog as an astronaut on the moon"
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    data-testid="custom-prompt"
                  />
                </label>
              ) : null}
              {errorBox}
              <button
                type="button"
                className="mt-5 w-full rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink disabled:opacity-50"
                disabled={busy || !canGenerate}
                onClick={() => void generate()}
                data-testid="preview-generate"
              >
                {busy ? "Starting..." : left > 0 ? "Make my free preview" : "No free previews left"}
              </button>
            </section>
          ) : null}

          {previews.length ? (
            <section className="mt-8">
              <h2 className="text-2xl">Your previews</h2>
              {status?.waitingForCredit ? (
                <p className="mt-2 text-sm text-muted">We are very busy right now. Your preview is queued and will appear here shortly.</p>
              ) : working ? (
                <p className="mt-2 text-sm text-muted">Painting your preview. This usually takes under a minute.</p>
              ) : ready.length ? (
                <p className="mt-2 text-sm text-muted">Tap the one you like best.</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((p) => (
                  <button
                    key={p.jobId}
                    type="button"
                    disabled={p.status !== "ready"}
                    onClick={() => p.assetId && setChosen(p.assetId)}
                    className={`overflow-hidden rounded-2xl border text-left ${chosen && chosen === p.assetId ? "border-pumpkin ring-2 ring-pumpkin" : "border-line"}`}
                    data-testid="preview-card"
                  >
                    {p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.previewUrl} alt={p.styleName} className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[3/4] w-full items-center justify-center bg-bark text-sm text-muted">
                        {p.status === "failed" ? "Could not make this one" : "Working..."}
                      </span>
                    )}
                    <span className="block p-2 text-sm">{p.styleName}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {ready.length && chosen ? (
            <section className="mt-8 rounded-3xl border border-line p-4" data-testid="buy-choice">
              <h2 className="text-2xl">Love it? Choose one</h2>
              <label className="mt-3 flex gap-3 text-xs leading-5 text-cream/75">
                <input type="checkbox" checked={supplyConsent} onChange={(e) => setSupplyConsent(e.target.checked)} data-testid="supply-consent" />
                {DIGITAL_SUPPLY_CONSENT_LABEL}
              </label>
              {errorBox}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="rounded-3xl bg-pumpkin p-4 text-left text-ink disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void checkout("digital")}
                  data-testid="buy-digital"
                >
                  <span className="block text-lg font-semibold">Digital pack {formatGbp(DIGITAL_PACK_PENCE)}</span>
                  <span className="mt-1 block text-sm">Your previews in HD, no watermark, by email.</span>
                </button>
                <button
                  type="button"
                  className="rounded-3xl border border-pumpkin p-4 text-left disabled:opacity-50"
                  disabled={busy}
                  onClick={() => (supplyConsent ? setPath("physical") : setError("Please tick the digital delivery box above to continue."))}
                  data-testid="buy-physical"
                >
                  <span className="block text-lg font-semibold">Put it on a gift</span>
                  <span className="mt-1 block text-sm text-cream/75">Mugs, prints, canvas and more. Digital files included free.</span>
                </button>
              </div>
            </section>
          ) : null}

          <button type="button" className="mt-8 text-sm text-muted underline" onClick={startOver}>
            Start again with a new photo
          </button>
        </>
      )}
    </main>
  );
}

export function StyleThumb({ style, className = "" }: { style: PreviewStyle; className?: string }) {
  if (style.before && style.thumbnail) {
    return (
      <span className={`relative grid aspect-[3/4] w-full grid-cols-2 ${className}`}>
        <img src={style.before} alt="" loading="lazy" className="h-full w-full object-cover" />
        <img src={style.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 text-[10px] text-cream">Before</span>
        <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1.5 text-[10px] text-cream">After</span>
      </span>
    );
  }
  return style.thumbnail ? (
    <img src={style.thumbnail} alt="" loading="lazy" className={`block aspect-[3/4] w-full object-cover ${className}`} />
  ) : (
    <span className={`block aspect-[3/4] w-full ${className}`} style={{ background: style.swatch }} />
  );
}
