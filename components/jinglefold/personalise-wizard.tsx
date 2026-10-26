"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DIGITAL_SUPPLY_CONSENT_LABEL, PHOTO_CONSENT_LABEL } from "@/config/brand";
import {
  cutoffIsoForKind,
  isPastCutoff,
  JINGLEFOLD_PERSONALISED_CONSENT,
  type JinglefoldPersonalisedId,
} from "@/config/jinglefold";
import { formatGbp } from "@/config/pricing";
import { SUBJECTS } from "@/config/themes";
import type { StyleDefinition } from "@/config/themes";

type Product = {
  id: JinglefoldPersonalisedId;
  slug: string;
  name: string;
  detail: string;
  cutoffKind: "prodigi_bauble" | "printful_stocking";
  pricePence: number;
};

async function prepare(file: File) {
  const imageCompression = (await import("browser-image-compression")).default;
  return imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg" });
}

export function JinglefoldPersonaliseWizard({
  product,
  cutoffs,
  styles,
}: {
  product: Product;
  cutoffs: { prodigiBaubleIso: string; printfulStockingIso: string; goDropshipDecorIso: string };
  styles: StyleDefinition[];
}) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const [subject, setSubject] = useState<"pet" | "family" | "couple" | "me">("pet");
  const [email, setEmail] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [personalisedConsent, setPersonalisedConsent] = useState(false);
  const [lateAck, setLateAck] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cutoffIso = cutoffIsoForKind(cutoffs, product.cutoffKind);
  const pastCutoff = isPastCutoff(cutoffIso);

  useEffect(() => {
    if (styles[0]) setStyleId(styles[0].id);
  }, [styles]);

  async function startPreview() {
    setBusy(true);
    setError("");
    if (!file) {
      setError("Add a photo first.");
      setBusy(false);
      return;
    }
    if (pastCutoff && !lateAck) {
      setError("Please acknowledge late delivery.");
      setBusy(false);
      return;
    }
    const create = await fetch("/api/jinglefold/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productSlug: product.slug,
        email,
        styleId,
        subjectType: subject,
        photoConsent,
        digitalSupplyConsent: digitalConsent,
        personalisedConsent,
        lateDeliveryAck: pastCutoff ? lateAck : undefined,
      }),
    });
    const body = await create.json();
    if (!create.ok) {
      setError(body.error || "Could not start order");
      setBusy(false);
      return;
    }
    const form = new FormData();
    form.set("orderId", body.orderId);
    form.set("uploadToken", body.uploadToken);
    form.set("file", await prepare(file));
    const upload = await fetch("/api/uploads", { method: "POST", body: form });
    if (!upload.ok) {
      const up = await upload.json().catch(() => ({}));
      setError(up.error || "Upload failed");
      setBusy(false);
      return;
    }
    const finish = await fetch("/api/jinglefold/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: body.orderId, uploadToken: body.uploadToken }),
    });
    const fin = await finish.json();
    if (!finish.ok) {
      setError(fin.error || "Could not start preview");
      setBusy(false);
      return;
    }
    window.location.href = `/results/${fin.resultsToken}`;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="jinglefold-personalise">
      <p className="text-sm text-[var(--moss)]">
        <Link href="/">← Jinglefold</Link>
      </p>
      <h1 className="font-display text-3xl text-[var(--ink)]">{product.name}</h1>
      <p className="mt-2 text-[var(--moss)]">{product.detail}</p>
      <p className="mt-2 font-semibold">{formatGbp(product.pricePence)} · UK delivery included</p>
      {pastCutoff ? (
        <p className="mt-4 rounded-xl border border-amber-700/40 bg-amber-50 p-3 text-sm text-amber-950">
          This product may arrive after Christmas. Last recommended order date has passed.
        </p>
      ) : (
        <p className="mt-4 text-sm text-[var(--moss)]">
          Order by {new Date(cutoffIso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} for Christmas
          delivery (estimate).
        </p>
      )}

      {step === 1 ? (
        <section className="mt-8 space-y-4">
          <label className="block text-sm">
            Photo
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full"
              data-testid="jinglefold-photo"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="rounded-full bg-[var(--pumpkin)] px-5 py-2 text-white" onClick={() => setStep(2)}>
            Continue
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Who is in the photo?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm ${subject === s.id ? "bg-[var(--pumpkin)] text-white" : ""}`}
                  onClick={() => setSubject(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Festive style</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`rounded-xl border p-3 text-left text-sm ${styleId === style.id ? "ring-2 ring-[var(--gold)]" : ""}`}
                  onClick={() => setStyleId(style.id)}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" className="rounded-full border px-4 py-2" onClick={() => setStep(3)}>
            Continue
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-8 space-y-4">
          <label className="block text-sm">
            Email
            <input className="field mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="jinglefold-email" />
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} />
            {PHOTO_CONSENT_LABEL}
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={digitalConsent} onChange={(e) => setDigitalConsent(e.target.checked)} />
            {DIGITAL_SUPPLY_CONSENT_LABEL}
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={personalisedConsent} onChange={(e) => setPersonalisedConsent(e.target.checked)} />
            {JINGLEFOLD_PERSONALISED_CONSENT}
          </label>
          {pastCutoff ? (
            <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={lateAck} onChange={(e) => setLateAck(e.target.checked)} data-testid="jinglefold-late-ack" />
              I understand this may arrive after Christmas.
            </label>
          ) : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-full bg-[var(--pumpkin)] py-3 font-medium text-white disabled:opacity-50"
            data-testid="jinglefold-preview-btn"
            onClick={startPreview}
          >
            {busy ? "Creating preview…" : "Create preview"}
          </button>
        </section>
      ) : null}
    </main>
  );
}
