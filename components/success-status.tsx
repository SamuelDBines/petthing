"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutSuccessView } from "@/components/checkout-success-view";
import type { CheckoutSuccessPayload } from "@/lib/checkout/success-types";
import { readMetaPurchaseForSession, readStashedMetaPurchase } from "@/lib/meta/client";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/brand";

const TERMINAL_PHASES = new Set<CheckoutSuccessPayload["phase"]>([
  "ready",
  "failed",
  "refunded",
  "expired_unpaid",
  "christmas_booked",
  "print_processing",
]);

export function SuccessStatus() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [payload, setPayload] = useState<CheckoutSuccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [devNote, setDevNote] = useState("");

  useEffect(() => {
    if (sessionId) {
      try {
        window.localStorage.removeItem("pawtraitry-preview-session");
      } catch {
        /* ignore */
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let stop = false;
    let timer: number | undefined;
    async function poll() {
      const response = await fetch(`/api/status?session_id=${encodeURIComponent(sessionId!)}`);
      const body = (await response.json()) as CheckoutSuccessPayload;
      if (stop) return;
      setPayload(body);
      setLoading(false);
      if (
        body.trackPurchase &&
        body.amountPence &&
        !sessionStorage.getItem(`ps_purchase_${sessionId}`)
      ) {
        readStashedMetaPurchase(sessionId);
        const meta = readMetaPurchaseForSession(sessionId!);
        const { trackMetaEvent } = await import("@/lib/meta/client");
        trackMetaEvent(
          "Purchase",
          {
            value: body.amountPence / 100,
            currency: "GBP",
            contentIds: meta?.contentIds,
          },
          meta?.purchaseEventId,
        );
        sessionStorage.setItem(`ps_purchase_${sessionId}`, "1");
      }
      if (TERMINAL_PHASES.has(body.phase) && timer) {
        window.clearInterval(timer);
      }
    }
    void poll();
    timer = window.setInterval(poll, 4000);
    return () => {
      stop = true;
      if (timer) window.clearInterval(timer);
    };
  }, [sessionId]);

  async function paint() {
    setDevNote("Painting…");
    const response = await fetch("/api/dev/process", { method: "POST" });
    const body = await response.json();
    setDevNote(
      response.ok ? `Queue ran ${body.processed} job(s). Refresh status in a moment.` : body.error || "Could not run the queue",
    );
  }

  const ordersEmail = "orders@pawtraitry.com";

  return (
    <>
      <CheckoutSuccessView
        payload={payload}
        loading={loading && !payload}
        brand={{ appName: APP_NAME, supportEmail: SUPPORT_EMAIL, ordersEmail }}
      />
      {!sessionId ? (
        <p className="mx-auto max-w-3xl px-4 pb-8 text-sm text-muted">Missing checkout session. Return from Stripe or open the link in your confirmation email.</p>
      ) : null}
      {process.env.NODE_ENV !== "production" ? (
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <button className="rounded-full border border-line px-4 py-3 text-sm" type="button" onClick={paint}>
            Paint the portraits now (local demo)
          </button>
          {devNote ? <p className="mt-2 text-sm text-muted">{devNote}</p> : null}
        </div>
      ) : null}
    </>
  );
}
