"use client";

import { checkoutErrorMessage, parseCheckoutResponse } from "@/lib/checkout/client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DIGITAL_SUPPLY_CONSENT_LABEL, PHOTO_CONSENT_LABEL } from "@/config/brand";
import { formatGbp, SEASON_PASS, TIERS, type TierId } from "@/config/pricing";
import { SUBJECTS, THEMES, type StyleDefinition, type SubjectType } from "@/config/themes";
import { track } from "@/components/cookie-banner";
import { storedUtm } from "@/components/utm-capture";
import { metaAttributionRequestBody } from "@/lib/meta/api-schema";
import { metaCheckoutAttribution, stashMetaCheckoutAttribution, trackMetaEvent } from "@/lib/meta/client";

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

export function CreateWizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<SubjectType>("pet");
  const [files, setFiles] = useState<File[]>([]);
  const [tierId, setTierId] = useState<TierId>("classic");
  const [styles, setStyles] = useState<string[]>([]);
  const [themeStyles, setThemeStyles] = useState<StyleDefinition[]>(THEMES[0].styles);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [paused, setPaused] = useState(false);
  const [cardNames, setCardNames] = useState("");
  const [email, setEmail] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [digitalSupplyConsent, setDigitalSupplyConsent] = useState(false);
  const [priority, setPriority] = useState(false);
  const [referral, setReferral] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const previewTracked = useRef(false);
  const seasonPass = params.get("offer") === "season";

  useEffect(() => {
    if (!seasonPass) return;
    setSubject("family");
    setTierId(SEASON_PASS.tierId);
  }, [seasonPass]);

  useEffect(() => {
    if (!sessionStorage.getItem("ps_started")) {
      sessionStorage.setItem("ps_started", "1");
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "create_start" }) }).catch(() => undefined);
    }
    const stored = storedUtm();
    if (stored.ref) setReferral(stored.ref);
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (data.theme) {
          setThemeId(data.theme.id);
          setThemeStyles(data.theme.styles);
        }
        setPaused(Boolean(data.salesPaused));
      })
      .catch(() => undefined);
  }, []);

  const tier = TIERS.find((item) => item.id === tierId) ?? TIERS[1];
  const slotCount = tier.styleCount === "all" ? themeStyles.length : tier.styleCount;

  function chooseTier(next: TierId) {
    setTierId(next);
    const chosen = TIERS.find((item) => item.id === next);
    if (!chosen) return;
    if (chosen.styleCount === "all") setStyles(themeStyles.map((style) => style.id));
    else setStyles((current) => current.slice(0, chosen.styleCount as number));
  }

  function toggleStyle(id: string) {
    if (tier.styleCount === "all") return;
    setStyles((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= slotCount) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    const incoming = Array.from(list).slice(0, 6 - files.length);
    try {
      const prepared: File[] = [];
      for (const file of incoming) prepared.push(await prepare(file));
      setFiles((current) => [...current, ...prepared].slice(0, 6));
    } catch {
      setError("We couldn’t read one of those photos. Try a JPEG or PNG.");
    }
  }

  useEffect(() => {
    if (step !== 4 || previewTracked.current) return;
    previewTracked.current = true;
    trackMetaEvent("Lead");
    void import("@/components/visitor-tracker").then(({ trackFunnelEvent }) => trackFunnelEvent("preview_generated"));
  }, [step]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const utm = storedUtm();
      const created = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          subjectType: subject,
          tierId,
          styleIds: tier.styleCount === "all" ? themeStyles.map((style) => style.id) : styles,
          cardNames,
          email,
          photoConsent,
          digitalSupplyConsent,
          priority: seasonPass ? false : priority,
          offer: seasonPass ? "season_pass" : "one_off",
          referralCode: referral || undefined,
          utm,
        }),
      });
      const order = await created.json();
      if (!created.ok) throw new Error(order.error || "Could not start the order");
      for (const file of files) {
        const body = new FormData();
        body.set("orderId", order.orderId);
        body.set("uploadToken", order.uploadToken);
        body.set("file", file);
        const uploaded = await fetch("/api/uploads", { method: "POST", body });
        const uploadData = await uploaded.json();
        if (!uploaded.ok) throw new Error(uploadData.error || "Upload failed");
        const { trackFunnelEvent } = await import("@/components/visitor-tracker");
        trackFunnelEvent("photo_upload");
      }
      const meta = metaCheckoutAttribution();
      stashMetaCheckoutAttribution(meta, [tierId, ...styles]);
      track("InitiateCheckout", order.amountPence / 100, meta.initiateCheckoutEventId);
      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "portrait",
          orderId: order.orderId,
          uploadToken: order.uploadToken,
          analyticsSessionId: (await import("@/components/visitor-tracker")).analyticsSessionId(),
          ...metaAttributionRequestBody(meta),
        }),
      });
      const { ok, body: session } = await parseCheckoutResponse(checkout);
      if (!ok || !session.url) throw new Error(checkoutErrorMessage(session, ok));
      const { trackFunnelEvent: trackCheckout } = await import("@/components/visitor-tracker");
      trackCheckout("checkout_started");
      window.location.href = session.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8" data-testid="create-wizard">
      <p className="text-sm text-gold">Step {step} of 4</p>
      <h1 className="mt-2 text-4xl">{seasonPass ? "Start the season pass" : "Make the portraits"}</h1>
      {seasonPass ? <p className="mt-3 text-cream/75">A family or group, once a year. This season is included. Pick {SEASON_PASS.tierId === "classic" ? "two" : "the"} styles for it.</p> : null}
      {params.get("cancelled") ? <p className="mt-3 text-sm">Checkout was cancelled. Your photos were not kept if you didn’t pay.</p> : null}
      {paused ? <p className="mt-4 rounded-2xl bg-gold/10 p-4">Sales are paused. You can look around, but payment is closed.</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-danger p-4 text-sm text-danger">{error}</p> : null}

      {step === 1 && seasonPass ? (
        <section className="mt-6 space-y-3">
          <p className="rounded-3xl border border-gold/40 p-4">Family or group. Pets and couples stay on the one-off order.</p>
          <button className="rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink" onClick={() => { setSubject("family"); setStep(2); }}>Continue</button>
        </section>
      ) : null}

      {step === 1 && !seasonPass ? (
        <section className="mt-6 space-y-3">
          {SUBJECTS.map((item) => (
            <button key={item.id} type="button" onClick={() => setSubject(item.id)} className={`block w-full rounded-3xl border p-4 text-left ${subject === item.id ? "border-pumpkin" : "border-line"}`}>
              <span className="text-xl">{item.label}</span>
              <span className="mt-1 block text-sm text-cream/70">{item.hint}</span>
            </button>
          ))}
          <button className="rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink" onClick={() => setStep(2)}>Continue</button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-6">
          <p className="text-cream/75">{seasonPass ? "Clear faces, good light, everyone easy to see. 1 to 6 photos." : "Clear faces, good light, no sunglasses. Pets should be looking at the camera. 1 to 6 photos."}</p>
          <label
            className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-line p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void onFiles(event.dataTransfer.files);
            }}
          >
            Drop photos here, or take one with the camera
            <input className="sr-only" type="file" accept="image/*,.heic,.heif" multiple onChange={(event) => onFiles(event.target.files)} data-testid="photo-upload" />
          </label>
          <ul className="mt-4 space-y-2 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex justify-between gap-3">
                <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, item) => item !== index))}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button className="rounded-full border border-line px-5 py-3" onClick={() => setStep(1)}>Back</button>
            <button className="rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink" disabled={!files.length} onClick={() => setStep(3)}>Continue</button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-6 space-y-4">
          {seasonPass ? <p className="rounded-3xl border border-gold/40 p-4">{SEASON_PASS.name} · {formatGbp(SEASON_PASS.pricePence)} a year. This season uses the Classic set: two styles, six HD images.</p> : (
          <div className="grid gap-2">
            {TIERS.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseTier(item.id)} className={`rounded-3xl border p-4 text-left ${tierId === item.id ? "border-pumpkin" : "border-line"}`}>
                <span className="flex justify-between"><span>{item.name}{item.popular ? " · most popular" : ""}</span><span>{formatGbp(item.pricePence)}</span></span>
                <span className="mt-1 block text-sm text-cream/70">{item.points.join(" · ")}</span>
              </button>
            ))}
          </div>
          )}
          <p>Choose {slotCount} style{slotCount === 1 ? "" : "s"}.</p>
          <div className="grid grid-cols-2 gap-2">
            {themeStyles.map((style) => (
              <button key={style.id} type="button" onClick={() => toggleStyle(style.id)} className={`rounded-2xl border p-3 text-left ${styles.includes(style.id) ? "border-pumpkin" : "border-line"}`}>
                {style.thumbnail ? (
                  <img src={style.thumbnail} alt="" className="mb-2 aspect-[4/3] w-full rounded-xl object-cover" />
                ) : (
                  <span className="mb-2 block h-8 rounded-xl" style={{ background: style.swatch }} />
                )}
                {style.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-line px-5 py-3" onClick={() => setStep(2)}>Back</button>
            <button className="rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink" disabled={styles.length !== slotCount && tier.styleCount !== "all"} onClick={() => { if (tier.styleCount === "all") setStyles(themeStyles.map((style) => style.id)); setStep(4); }}>Continue</button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="mt-6 space-y-4">
          <label className="block text-sm">Names for the card, optional
            <input className="field mt-1" value={cardNames} onChange={(event) => setCardNames(event.target.value)} placeholder="Love from the Smiths" maxLength={80} />
          </label>
          <label className="block text-sm">Email
            <input className="field mt-1" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} data-testid="checkout-email" />
          </label>
          <label className="block text-sm">Referral code
            <input className="field mt-1" value={referral} onChange={(event) => setReferral(event.target.value)} placeholder="PAW-••••••" />
          </label>
          {seasonPass ? null : (
            <label className="flex gap-3 text-sm leading-6">
              <input type="checkbox" checked={priority} onChange={(event) => setPriority(event.target.checked)} />
              Priority delivery, under 2 hours, {formatGbp(299)}
            </label>
          )}
          <label className="flex gap-3 text-sm leading-6">
            <input type="checkbox" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} />
            {PHOTO_CONSENT_LABEL}
          </label>
          <label className="flex gap-3 text-sm leading-6">
            <input type="checkbox" checked={digitalSupplyConsent} onChange={(event) => setDigitalSupplyConsent(event.target.checked)} />
            {DIGITAL_SUPPLY_CONSENT_LABEL}
          </label>
          <div className="flex gap-2">
            <button className="rounded-full border border-line px-5 py-3" onClick={() => setStep(3)}>Back</button>
            <button className="rounded-full bg-pumpkin px-5 py-3 font-semibold text-ink disabled:opacity-50" disabled={busy || paused || !photoConsent || !digitalSupplyConsent || !email} onClick={pay} data-testid="pay-button">
              {busy ? "Sending…" : seasonPass ? `Start the pass · ${formatGbp(SEASON_PASS.pricePence)}/year` : "Pay securely"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
