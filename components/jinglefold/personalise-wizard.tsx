"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  PersonalisePreview,
  previewShapeForProductId,
} from "@/components/jinglefold/personalise-preview";

const REG_28_NOTE =
  "This is made to your specification. Under the Consumer Contracts Regulations 2013 (regulation 28), personalised goods are exempt from the 14-day cancellation right once production has started.";

type Product = {
  id: JinglefoldPersonalisedId;
  slug: string;
  name: string;
  detail: string;
  cutoffKind: "prodigi_bauble" | "printful_stocking";
  pricePence: number;
  mockupSrc: string;
  mockupWidth: number;
  mockupHeight: number;
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const [subject, setSubject] = useState<"pet" | "family" | "couple" | "me">("pet");
  const [email, setEmail] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [personalisedConsent, setPersonalisedConsent] = useState(false);
  const [lateAck, setLateAck] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const previewTracked = useRef(false);

  const cutoffIso = cutoffIsoForKind(cutoffs, product.cutoffKind);
  const pastCutoff = isPastCutoff(cutoffIso);
  const previewShape = previewShapeForProductId(product.id);
  const canContinueStep1 = Boolean(file);

  useEffect(() => {
    if (styles[0]) setStyleId(styles[0].id);
  }, [styles]);

  useEffect(() => {
    if (!file) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!photoUrl || step < 2 || previewTracked.current) return;
    previewTracked.current = true;
    void import("@/components/visitor-tracker").then(({ trackFunnelEvent }) => trackFunnelEvent("preview_generated"));
  }, [photoUrl, step]);

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
    <main className="mx-auto max-w-6xl px-4 py-10" data-testid="jinglefold-personalise">
      <Link href="/#personalised" className="text-sm text-muted">← Personalised gifts</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="rounded-3xl border border-line bg-bark/60 p-6">
          <PersonalisePreview
            shape={previewShape}
            sampleMockupSrc={product.mockupSrc}
            sampleWidth={product.mockupWidth}
            sampleHeight={product.mockupHeight}
            photoUrl={photoUrl}
          />
        </div>

        <div>
          <h1 className="display text-4xl text-cream">{product.name}</h1>
          <p className="mt-3 text-lg text-muted">{product.detail}</p>
          <p className="mt-4 text-2xl font-semibold text-cream">
            {formatGbp(product.pricePence)}
            <span className="ml-2 text-base font-normal text-muted">UK delivery included</span>
          </p>

          {pastCutoff ? (
            <p className="mt-4 rounded-xl border border-pumpkin/40 bg-pumpkin/10 p-3 text-sm text-cream">
              This product may arrive after Christmas. Last recommended order date has passed.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Order by{" "}
              {new Date(cutoffIso).toLocaleDateString("en-GB", {
                timeZone: "Europe/London",
                day: "numeric",
                month: "short",
              })}{" "}
              for Christmas delivery (estimate).
            </p>
          )}

          <p className="mt-4 rounded-xl border border-line bg-ink/40 p-3 text-xs leading-5 text-muted">{REG_28_NOTE}</p>

          {step === 1 ? (
            <section className="mt-8 space-y-4" aria-label="Upload photo">
              <label className="block text-sm font-medium text-cream">
                Your photo
                <input
                  type="file"
                  accept="image/*"
                  className="field mt-2 min-h-12 w-full cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-pumpkin file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  data-testid="jinglefold-photo"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-muted">Clear faces, good light, no sunglasses. JPG or PNG up to about 12&nbsp;MB.</p>
              <button
                type="button"
                disabled={!canContinueStep1}
                className={
                  canContinueStep1
                    ? "min-h-12 rounded-full bg-pumpkin px-8 text-sm font-semibold text-white"
                    : "min-h-12 cursor-not-allowed rounded-full border-2 border-cream bg-bark px-8 text-sm font-semibold text-cream"
                }
                onClick={() => canContinueStep1 && setStep(2)}
              >
                Continue
              </button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mt-8 space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-cream">Who is in the photo?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`rounded-full border border-line px-3 py-1.5 text-sm ${subject === s.id ? "bg-pumpkin text-white" : "text-cream"}`}
                      onClick={() => setSubject(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-cream">Festive style</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={`rounded-xl border border-line bg-bark p-3 text-left text-sm text-cream ${styleId === style.id ? "ring-2 ring-gold" : ""}`}
                      onClick={() => setStyleId(style.id)}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="rounded-full border border-line px-4 py-2 text-sm text-cream" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="min-h-12 rounded-full bg-pumpkin px-6 text-sm font-semibold text-white" onClick={() => setStep(3)}>
                  Continue
                </button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="mt-8 space-y-4">
              <label className="block text-sm font-medium text-cream">
                Email for your preview link
                <input
                  className="field mt-2 w-full"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="jinglefold-email"
                />
              </label>
              <label className="flex gap-2 text-sm text-muted">
                <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} />
                {PHOTO_CONSENT_LABEL}
              </label>
              <label className="flex gap-2 text-sm text-muted">
                <input type="checkbox" checked={digitalConsent} onChange={(e) => setDigitalConsent(e.target.checked)} />
                {DIGITAL_SUPPLY_CONSENT_LABEL}
              </label>
              <label className="flex gap-2 text-sm text-muted">
                <input type="checkbox" checked={personalisedConsent} onChange={(e) => setPersonalisedConsent(e.target.checked)} />
                {JINGLEFOLD_PERSONALISED_CONSENT}
              </label>
              {pastCutoff ? (
                <label className="flex gap-2 text-sm text-muted">
                  <input type="checkbox" checked={lateAck} onChange={(e) => setLateAck(e.target.checked)} data-testid="jinglefold-late-ack" />
                  I understand this may arrive after Christmas.
                </label>
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={busy}
                className="w-full min-h-12 rounded-full bg-pumpkin py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="jinglefold-preview-btn"
                onClick={startPreview}
              >
                {busy ? "Creating preview…" : "Create preview"}
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
