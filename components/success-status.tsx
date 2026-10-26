"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/components/cookie-banner";
import { formatGbp } from "@/config/pricing";

type Status = { kind: string; status: string; resultsPath: string | null; amountPence: number | null };

export function SuccessStatus() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<Status | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    async function poll() {
      const response = await fetch(`/api/status?session_id=${encodeURIComponent(sessionId!)}`);
      const body = (await response.json()) as Status;
      if (stop) return;
      setStatus(body);
      if (body.amountPence && !sessionStorage.getItem(`ps_purchase_${sessionId}`)) {
        track("Purchase", body.amountPence / 100);
        sessionStorage.setItem(`ps_purchase_${sessionId}`, "1");
      }
    }
    void poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  async function paint() {
    setNote("Painting…");
    const response = await fetch("/api/dev/process", { method: "POST" });
    const body = await response.json();
    setNote(response.ok ? `Queue ran ${body.processed} job(s). Refresh status in a moment.` : body.error || "Could not run the queue");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-4xl">{status?.kind === "christmas" ? "Christmas is booked" : "Payment received"}</h1>
      <p className="mt-3 text-cream/75">
        {status?.kind === "christmas"
          ? "We’ll email you on 1 November."
          : "Portraits are queued. You’ll get an email when the private gallery is ready. You can close this page."}
      </p>
      {status ? <p className="mt-4 text-sm">Status: {status.status}{status.amountPence ? ` · ${formatGbp(status.amountPence)}` : ""}</p> : <p className="mt-4">Checking Stripe…</p>}
      {status?.resultsPath ? <a className="mt-4 inline-block rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink" href={status.resultsPath}>Open the gallery</a> : null}
      {process.env.NODE_ENV !== "production" ? (
        <button className="mt-6 block rounded-full border border-line px-4 py-3" onClick={paint}>Paint the portraits now (local demo)</button>
      ) : null}
      {note ? <p className="mt-3 text-sm">{note}</p> : null}
    </main>
  );
}
