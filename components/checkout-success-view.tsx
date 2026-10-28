"use client";

import Image from "next/image";
import Link from "next/link";
import { formatGbp } from "@/config/pricing";
import type { CheckoutSuccessPayload } from "@/lib/checkout/success-types";
import { checkoutSuccessCopy, showCheckoutUpsells } from "@/lib/checkout/success-view";

type BrandHints = {
  appName: string;
  supportEmail: string;
  ordersEmail: string;
};

function formatOrderedAt(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function Timeline({ phase }: { phase: CheckoutSuccessPayload["phase"] }) {
  const steps = [
    { id: "pay", label: "Payment confirmed" },
    { id: "gen", label: "Portraits generating (usually a few minutes)" },
    { id: "mail", label: "Gallery email sent" },
  ];
  const active =
    phase === "confirming" ? 0 : phase === "generating" || phase === "review" ? 1 : phase === "ready" ? 3 : -1;
  if (active < 0) return null;
  return (
    <ol className="mt-6 space-y-3" aria-label="What happens next">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <li key={step.id} className="flex gap-3 text-sm">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-moss text-ink" : current ? "bg-pumpkin text-ink" : "border border-line text-muted"
              }`}
              aria-hidden
            >
              {done ? "✓" : index + 1}
            </span>
            <span className={current ? "font-medium text-cream" : "text-muted"}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressRing({ progress }: { progress: NonNullable<CheckoutSuccessPayload["progress"]> }) {
  const pct = progress.expected ? Math.min(100, Math.round((progress.generated / progress.expected) * 100)) : 0;
  return (
    <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-bark/40 p-4" role="status">
      <div
        className="relative h-14 w-14 shrink-0 rounded-full border-4 border-line"
        style={{
          background: `conic-gradient(var(--color-pumpkin) ${pct}%, transparent ${pct}%)`,
        }}
        aria-label={`${progress.generated} of ${progress.expected} portraits ready`}
      />
      <div>
        <p className="font-medium">Painting in progress</p>
        <p className="text-sm text-muted">
          {progress.generated} of {progress.expected} portraits finished
        </p>
      </div>
    </div>
  );
}

export function CheckoutSuccessView({
  payload,
  brand,
  loading,
}: {
  payload: CheckoutSuccessPayload | null;
  brand: BrandHints;
  loading?: boolean;
}) {
  const phase = payload?.phase ?? "confirming";
  const copy = checkoutSuccessCopy(phase, payload?.kind ?? "unknown");
  const upsells = payload ? showCheckoutUpsells(payload.phase) : false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12" data-testid="checkout-success" data-phase={phase}>
      {loading && !payload ? (
        <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
          <div className="h-10 w-2/3 rounded-lg bg-line/40" />
          <div className="h-4 w-full rounded bg-line/30" />
          <div className="h-32 rounded-2xl bg-line/20" />
        </div>
      ) : null}

      {!loading || payload ? (
        <>
          <p className="text-sm font-medium uppercase tracking-wide text-gold">{brand.appName}</p>
          <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{copy.lead}</p>

          {phase === "refunded" || phase === "expired_unpaid" ? (
            <Link
              href="/create"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-pumpkin px-8 text-base font-semibold text-ink"
            >
              Start a new portrait
            </Link>
          ) : null}

          {payload?.progress ? <ProgressRing progress={payload.progress} /> : null}

          {payload && (payload.packageName || payload.orderRef) ? (
            <section
              className="mt-8 rounded-[2rem] border border-line bg-bark p-6 shadow-sm"
              aria-labelledby="order-summary-heading"
            >
              <h2 id="order-summary-heading" className="text-xl font-semibold">
                Order summary
              </h2>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                {payload.uploadThumbnailUrl ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-ink">
                    <Image
                      src={payload.uploadThumbnailUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                ) : null}
                <dl className="grid flex-1 gap-2 text-sm sm:grid-cols-2">
                  {payload.packageName ? (
                    <>
                      <dt className="text-muted">Package</dt>
                      <dd className="font-medium">{payload.packageName}</dd>
                    </>
                  ) : null}
                  {payload.styleNames.length ? (
                    <>
                      <dt className="text-muted">Styles</dt>
                      <dd>{payload.styleNames.join(", ")}</dd>
                    </>
                  ) : null}
                  {payload.imageCount != null ? (
                    <>
                      <dt className="text-muted">Portraits</dt>
                      <dd>{payload.imageCount} images</dd>
                    </>
                  ) : null}
                  {payload.amountPence != null ? (
                    <>
                      <dt className="text-muted">Paid</dt>
                      <dd>{formatGbp(payload.amountPence)}</dd>
                    </>
                  ) : null}
                  {payload.orderRef ? (
                    <>
                      <dt className="text-muted">Order ref</dt>
                      <dd className="font-mono text-xs tracking-wide">{payload.orderRef}</dd>
                    </>
                  ) : null}
                  {payload.email ? (
                    <>
                      <dt className="text-muted">Gallery email</dt>
                      <dd>{payload.email}</dd>
                    </>
                  ) : null}
                  {payload.orderedAt ? (
                    <>
                      <dt className="text-muted">Ordered</dt>
                      <dd>{formatOrderedAt(payload.orderedAt)}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
              {payload.failureReason && phase === "failed" ? (
                <p className="mt-4 rounded-xl bg-pumpkin/10 p-3 text-sm text-cream">{payload.failureReason}</p>
              ) : null}
            </section>
          ) : null}

          {(phase === "confirming" || phase === "generating" || phase === "review" || phase === "ready") &&
          payload?.kind === "portrait" ? (
            <section className="mt-8 rounded-2xl border border-line bg-moss/30 p-6">
              <h2 className="text-lg font-semibold">What happens next</h2>
              <Timeline phase={phase} />
              <p className="mt-4 text-sm text-muted">
                Check spam and add{" "}
                <a className="underline" href={`mailto:${brand.ordersEmail}`}>
                  {brand.ordersEmail}
                </a>{" "}
                to your contacts so the gallery email lands in your inbox.
              </p>
            </section>
          ) : null}

          {payload?.resultsPath && (phase === "ready" || phase === "print_processing") ? (
            <Link
              href={payload.resultsPath}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-pumpkin px-8 text-center text-base font-semibold text-ink sm:w-auto"
            >
              Open your gallery
            </Link>
          ) : null}

          {payload?.orderRef ? (
            <p className="mt-8 text-sm text-muted">
              Need help? Email{" "}
              <a className="underline" href={`mailto:${brand.supportEmail}?subject=Order%20${payload.orderRef}`}>
                {brand.supportEmail}
              </a>{" "}
              and include order ref <span className="font-mono">{payload.orderRef}</span>.
            </p>
          ) : null}

          {upsells ? (
            <section className="mt-10 rounded-[2rem] border border-line bg-ink/40 p-6" aria-labelledby="upsell-heading">
              <h2 id="upsell-heading" className="text-lg font-semibold">
                While you wait
              </h2>
              <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <li>
                  <Link href="/create" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-medium">
                    Create another portrait
                  </Link>
                </li>
                <li>
                  <Link href="/#pass" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-medium">
                    Season pass
                  </Link>
                </li>
                {payload?.resultsPath ? (
                  <li>
                    <Link
                      href={`${payload.resultsPath}#prints`}
                      className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-medium"
                    >
                      Framed prints, canvas &amp; gifts
                    </Link>
                  </li>
                ) : (
                  <li>
                    <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-line px-5 text-sm text-muted">
                      Framed prints, canvas &amp; gifts — open your gallery when ready
                    </span>
                  </li>
                )}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
