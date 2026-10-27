"use client";

import { useState } from "react";
import { formatGbp } from "@/config/pricing";
import type { ShopOrder } from "@/lib/catalogue/types";

type EmailKind = "confirmation" | "submitted" | "dispatched" | "delivered" | "review";

export function AdminShopOrderPanel({
  order,
  onUpdated,
  onError,
}: {
  order: ShopOrder;
  onUpdated: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [shipping, setShipping] = useState({
    name: order.shipping?.name ?? "",
    line1: order.shipping?.line1 ?? "",
    line2: order.shipping?.line2 ?? "",
    city: order.shipping?.city ?? "",
    postalCode: order.shipping?.postalCode ?? "",
    countryCode: order.shipping?.countryCode ?? "GB",
  });

  async function post(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/shop-orders/${order.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      onError(data.error ?? "Action failed");
      return;
    }
    await onUpdated();
  }

  async function patch(body: Record<string, unknown>, confirmEarlyShip = false) {
    const response = await fetch(`/api/admin/shop-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, confirmEarlyShip: confirmEarlyShip || body.confirmEarlyShip }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (
        !confirmEarlyShip &&
        order.status === "paid" &&
        (body.status === "shipped" || body.trackingNumber) &&
        String(data.error ?? "").includes("confirmEarlyShip")
      ) {
        const ok = window.confirm(
          "This order has not been sent to the supplier yet. Mark as shipped anyway?",
        );
        if (ok) return patch(body, true);
      }
      onError(data.error ?? "Update failed");
      return;
    }
    await onUpdated();
  }

  const canFulfill = order.lines.some((l) => l.supplier === "go_dropship");
  const editableAddress =
    order.status === "paid" || order.status === "submitted_to_supplier";

  return (
    <div className="py-2">
      <button type="button" className="text-sm underline" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Manage"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-line p-3 text-xs">
          {order.fulfillmentError ? (
            <p className="text-red-300">Fulfilment error: {order.fulfillmentError}</p>
          ) : null}
          {order.supplierBatchId ? (
            <p className="text-cream/60">Supplier batch: {order.supplierBatchId.slice(0, 8)}</p>
          ) : null}
          {order.shippedAt ? <p className="text-cream/60">Shipped {new Date(order.shippedAt).toLocaleString("en-GB")}</p> : null}
          {order.deliveredAt ? <p className="text-cream/60">Delivered {new Date(order.deliveredAt).toLocaleString("en-GB")}</p> : null}

          <label className="block">
            Tracking
            <input className="field mt-1 w-full" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </label>
          <button
            type="button"
            className="block"
            onClick={() => void patch({ trackingNumber: tracking, status: "shipped" })}
          >
            Mark shipped + email
          </button>
          <button type="button" className="block" onClick={() => void patch({ status: "delivered" })}>
            Mark delivered + email
          </button>

          {editableAddress ? (
            <div className="space-y-1 border-t border-line pt-2">
              <p className="font-medium">Shipping address</p>
              <input className="field w-full" placeholder="Name" value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} />
              <input className="field w-full" placeholder="Line 1" value={shipping.line1} onChange={(e) => setShipping({ ...shipping, line1: e.target.value })} />
              <input className="field w-full" placeholder="Line 2" value={shipping.line2} onChange={(e) => setShipping({ ...shipping, line2: e.target.value })} />
              <input className="field w-full" placeholder="City" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} />
              <input className="field w-full" placeholder="Postcode" value={shipping.postalCode} onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })} />
              <button type="button" className="block" onClick={() => void patch({ shipping })}>
                Save address
              </button>
            </div>
          ) : null}

          <div className="border-t border-line pt-2 space-y-1">
            {canFulfill ? (
              <button type="button" className="block" onClick={() => void post({ action: "resubmit" })}>
                Resubmit to Go Dropship
              </button>
            ) : null}
            {order.status !== "refunded" && order.status !== "cancelled" && order.status !== "shipped" && order.status !== "delivered" ? (
              <button
                type="button"
                className="block"
                onClick={() => {
                  const refund = order.status === "paid";
                  const ok = window.confirm(
                    refund
                      ? "Cancel this order and refund the customer?"
                      : "Cancel this unpaid checkout?",
                  );
                  if (ok) void post({ action: "cancel", refund });
                }}
              >
                Cancel{order.status === "paid" ? " + refund" : ""}
              </button>
            ) : null}
            {order.status !== "refunded" && order.status !== "pending_payment" ? (
              <button type="button" className="block" onClick={() => void post({ action: "refund_full" })}>
                Full refund ({formatGbp(order.amountPence - (order.amountRefundedPence ?? 0))})
              </button>
            ) : null}
          </div>

          <div className="border-t border-line pt-2">
            <p className="mb-1 font-medium">Resend customer email</p>
            {(["confirmation", "submitted", "dispatched", "delivered", "review"] as EmailKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className="mr-2 inline-block capitalize"
                onClick={() => void post({ action: "resend_email", emailKind: kind })}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
