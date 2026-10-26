"use client";

import { useEffect, useState } from "react";

export default function HandPaintedProofPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<{ status: string; proofAssetUrl: string | null; sizeLabel: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/hand-painted/${params.token}`)
      .then((r) => r.json())
      .then(setState)
      .catch(() => setMessage("Could not load proof."));
  }, [params.token]);

  async function approve() {
    const response = await fetch(`/api/hand-painted/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Could not approve");
      return;
    }
    setMessage("Thanks — we’ll tell the artist to finish your painting.");
    setState((prev) => (prev ? { ...prev, status: "proof_approved" } : prev));
  }

  if (!state) return <main className="mx-auto max-w-lg px-4 py-16">{message || "Loading…"}</main>;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-3xl">Approve your artist proof</h1>
      <p className="mt-2 text-sm text-[var(--moss)]">{state.sizeLabel}</p>
      {state.proofAssetUrl ? (
        <img src={state.proofAssetUrl} alt="Artist proof" className="mt-6 w-full rounded-2xl border border-[var(--line)]" />
      ) : (
        <p className="mt-6">Your proof is not ready yet — we’ll email you when it is.</p>
      )}
      {state.status === "proof_sent_to_customer" && state.proofAssetUrl ? (
        <button type="button" className="mt-6 rounded-full bg-[var(--pumpkin)] px-5 py-3 text-white" onClick={approve}>
          Approve proof
        </button>
      ) : null}
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </main>
  );
}
