import { randomUUID } from "crypto";
import type { Shipping } from "@/lib/domain";
import { assertPrinterCanFetch } from "@/lib/prodigi";

export function printfulMocked() {
  return !process.env.PRINTFUL_API_KEY?.trim();
}

function baseUrl() {
  return process.env.PRINTFUL_API_BASE?.trim() || "https://api.printful.com";
}

async function printful(path: string, init?: RequestInit) {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return response;
}

export async function submitPrintfulOrder(args: {
  variantId: string;
  shipping: Shipping;
  imageUrl: string;
  externalId: string;
  quantity?: number;
}) {
  if (printfulMocked()) {
    const id = `mock_printful_${randomUUID().slice(0, 8)}`;
    console.log(`[printful mock] ${args.externalId} → ${id}`);
    return { printfulOrderId: id, status: "pending" };
  }
  assertPrinterCanFetch(args.imageUrl);
  const storeId = process.env.PRINTFUL_STORE_ID?.trim();
  if (!storeId) throw new Error("PRINTFUL_STORE_ID is not set");
  const body = {
    external_id: args.externalId,
    recipient: {
      name: args.shipping.name,
      address1: args.shipping.line1,
      address2: args.shipping.line2 || undefined,
      city: args.shipping.city,
      zip: args.shipping.postalCode,
      country_code: args.shipping.countryCode,
    },
    items: [
      {
        variant_id: Number(args.variantId),
        quantity: args.quantity ?? 1,
        files: [{ url: args.imageUrl }],
      },
    ],
  };
  const response = await printful(`/stores/${storeId}/orders`, { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { result?: { id?: number; status?: string } };
  if (!response.ok) {
    throw new Error(`Printful order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.result?.id;
  if (!id) throw new Error("Printful did not return an order id");
  return { printfulOrderId: String(id), status: payload.result?.status ?? "pending" };
}

export async function fetchPrintfulOrder(orderId: string) {
  if (printfulMocked()) {
    return { status: "fulfilled", trackingNumber: `MOCK${orderId.slice(-8)}`, trackingUrl: null };
  }
  const storeId = process.env.PRINTFUL_STORE_ID?.trim();
  if (!storeId) throw new Error("PRINTFUL_STORE_ID is not set");
  const response = await printful(`/stores/${storeId}/orders/@${orderId}`);
  const payload = (await response.json().catch(() => ({}))) as {
    result?: { status?: string; shipments?: { tracking_number?: string; tracking_url?: string }[] };
  };
  if (!response.ok) throw new Error(`Printful fetch failed (${response.status})`);
  const shipment = payload.result?.shipments?.[0];
  return {
    status: payload.result?.status ?? "unknown",
    trackingNumber: shipment?.tracking_number ?? null,
    trackingUrl: shipment?.tracking_url ?? null,
  };
}
