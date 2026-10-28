"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { readMetaPurchaseForSession, readStashedMetaPurchase, trackMetaEvent } from "@/lib/meta/client";

export function ShopSuccessStatus() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId || sessionStorage.getItem(`ps_purchase_${sessionId}`)) return;
    readStashedMetaPurchase(sessionId);
    const meta = readMetaPurchaseForSession(sessionId);
    void fetch(`/api/shop/order-status?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((body: { amountPence?: number | null }) => {
        if (!body.amountPence) return;
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
      })
      .catch(() => undefined);
  }, [sessionId]);

  return null;
}
