import { randomUUID } from "crypto";
import { printSku, type PrintProduct } from "@/config/prints";
import type { Shipping } from "@/lib/domain";
import { prodigiApiKey } from "@/lib/prodigi/config";

export function prodigiMocked() {
  return !prodigiApiKey();
}

function baseUrl() {
  if (process.env.PRODIGI_ENV === "live") return "https://api.prodigi.com/v4.0";
  return "https://api.sandbox.prodigi.com/v4.0";
}

async function prodigi(path: string, init?: RequestInit) {
  const key = prodigiApiKey();
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return response;
}

export function assertPrinterCanFetch(url: string) {
  const host = new URL(url).hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    throw new Error("The printer cannot download a portrait from this computer. Use the public site address, then try the puzzle again.");
  }
}

export async function quotePrintShipping(args: {
  product: PrintProduct;
  countryCode: string;
  items?: number;
}) {
  if (prodigiMocked()) {
    return { mocked: true, currency: "GBP", shipping: 499, subtotal: args.product.pricePence };
  }
  const sku = printSku(args.product);
  const response = await prodigi("/quotes", {
    method: "POST",
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: args.countryCode,
      items: [{ sku, copies: args.items ?? 1 }],
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    quotes?: { costSummary?: { totalCost?: { amount?: string; currency?: string } } }[];
  };
  if (!response.ok) throw new Error(`Prodigi quote failed (${response.status})`);
  const summary = payload.quotes?.[0]?.costSummary?.totalCost;
  return {
    mocked: false,
    currency: summary?.currency ?? "GBP",
    shipping: summary ? Math.round(Number(summary.amount) * 100) : null,
    subtotal: args.product.pricePence,
  };
}

export async function fetchProdigiOrder(orderId: string) {
  if (prodigiMocked()) {
    return { status: "Complete", trackingNumber: `MOCK${orderId.slice(-6)}`, trackingUrl: null };
  }
  const response = await prodigi(`/orders/${encodeURIComponent(orderId)}`);
  const payload = (await response.json().catch(() => ({}))) as {
    order?: { status?: { stage?: string }; shipments?: { tracking?: { number?: string; url?: string } }[] };
  };
  if (!response.ok) throw new Error(`Prodigi fetch failed (${response.status})`);
  const tracking = payload.order?.shipments?.[0]?.tracking;
  return {
    status: payload.order?.status?.stage ?? "unknown",
    trackingNumber: tracking?.number ?? null,
    trackingUrl: tracking?.url ?? null,
  };
}

export async function submitMerchandiseOrder(args: {
  sku: string;
  shipping: Shipping;
  assetUrl: string;
  printArea: string;
  merchantReference: string;
  copies?: number;
}) {
  if (prodigiMocked()) {
    const id = `mock_prodigi_${randomUUID().slice(0, 8)}`;
    console.log(`[prodigi mock] ${args.merchantReference} → ${id} (${args.sku})`);
    return { prodigiOrderId: id };
  }
  assertPrinterCanFetch(args.assetUrl);
  const body = {
    shippingMethod: "Standard",
    idempotencyKey: args.merchantReference,
    merchantReference: args.merchantReference,
    recipient: {
      name: args.shipping.name,
      address: {
        line1: args.shipping.line1,
        line2: args.shipping.line2 || undefined,
        townOrCity: args.shipping.city,
        postalOrZipCode: args.shipping.postalCode,
        countryCode: args.shipping.countryCode,
      },
    },
    items: [
      {
        sku: args.sku,
        copies: args.copies ?? 1,
        sizing: "fillPrintArea",
        merchantReference: args.merchantReference,
        assets: [{ printArea: args.printArea, url: args.assetUrl }],
      },
    ],
  };
  const response = await prodigi("/orders", { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { order?: { id?: string } };
  if (!response.ok) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.order?.id;
  if (!id) throw new Error("Prodigi did not return an order id");
  return { prodigiOrderId: id };
}

export async function submitPrintOrder(args: {
  product: PrintProduct;
  shipping: Shipping;
  assets: { printArea: string; url: string }[];
  merchantReference: string;
}) {
  if (prodigiMocked()) {
    const id = `mock_prodigi_${randomUUID().slice(0, 8)}`;
    console.log(`[prodigi mock] ${args.merchantReference} → ${id} (${args.product.id})`);
    return { prodigiOrderId: id };
  }
  for (const asset of args.assets) assertPrinterCanFetch(asset.url);
  const sku = printSku(args.product);
  const productResponse = await prodigi(`/products/${encodeURIComponent(sku)}`);
  if (productResponse.status === 404) {
    throw new Error(`Prodigi does not recognise SKU ${sku}. Set ${args.product.skuEnv} to a SKU from your catalogue.`);
  }
  if (!productResponse.ok) {
    throw new Error(`Prodigi product lookup failed (${productResponse.status})`);
  }

  const body = {
    shippingMethod: "Standard",
    idempotencyKey: args.merchantReference,
    merchantReference: args.merchantReference,
    recipient: {
      name: args.shipping.name,
      address: {
        line1: args.shipping.line1,
        line2: args.shipping.line2 || undefined,
        townOrCity: args.shipping.city,
        postalOrZipCode: args.shipping.postalCode,
        countryCode: args.shipping.countryCode,
      },
    },
    items: [
      {
        sku,
        copies: args.product.copies,
        sizing: "fillPrintArea",
        merchantReference: args.merchantReference,
        assets: args.assets.map((asset) => ({ printArea: asset.printArea, url: asset.url })),
      },
    ],
  };

  const response = await prodigi("/orders", { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { order?: { id?: string } };
  if (!response.ok) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.order?.id;
  if (!id) throw new Error("Prodigi did not return an order id");
  return { prodigiOrderId: id };
}
