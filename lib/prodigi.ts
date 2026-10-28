import { randomUUID } from "crypto";
import { printSku, type PrintProduct } from "@/config/prints";
import type { Shipping } from "@/lib/domain";
import { prodigiApiKeyForStore, prodigiUsesLiveApi } from "@/lib/prodigi/config";

export function prodigiMocked(storeId?: string) {
  return !prodigiApiKeyForStore(storeId ?? "pawtraitry");
}

function baseUrl(storeId: string) {
  if (prodigiUsesLiveApi(storeId)) return "https://api.prodigi.com/v4.0";
  return "https://api.sandbox.prodigi.com/v4.0";
}

async function prodigi(storeId: string, path: string, init?: RequestInit) {
  const key = prodigiApiKeyForStore(storeId);
  if (!key) throw new Error("Prodigi API key is not set for this store");
  const response = await fetch(`${baseUrl(storeId)}${path}`, {
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
  storeId?: string;
  product: PrintProduct;
  countryCode: string;
  items?: number;
}) {
  const storeId = args.storeId ?? "pawtraitry";
  if (prodigiMocked(storeId)) {
    return { mocked: true, currency: "GBP", shipping: 499, subtotal: args.product.pricePence };
  }
  const sku = printSku(args.product);
  const response = await prodigi(storeId, "/quotes", {
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

export async function fetchProdigiOrder(orderId: string, storeId = "pawtraitry") {
  if (prodigiMocked(storeId)) {
    return { status: "Complete", trackingNumber: `MOCK${orderId.slice(-6)}`, trackingUrl: null };
  }
  const response = await prodigi(storeId, `/orders/${encodeURIComponent(orderId)}`);
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
  storeId?: string;
  sku: string;
  shipping: Shipping;
  assetUrl: string;
  printArea: string;
  merchantReference: string;
  copies?: number;
}) {
  const storeId = args.storeId ?? "jinglefold";
  if (prodigiMocked(storeId)) {
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
  const response = await prodigi(storeId, "/orders", { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { order?: { id?: string } };
  if (!response.ok) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.order?.id;
  if (!id) throw new Error("Prodigi did not return an order id");
  return { prodigiOrderId: id };
}

export async function submitPrintOrder(args: {
  storeId?: string;
  product: PrintProduct;
  shipping: Shipping;
  assets: { printArea: string; url: string }[];
  merchantReference: string;
}) {
  const storeId = args.storeId ?? "pawtraitry";
  if (prodigiMocked(storeId)) {
    const id = `mock_prodigi_${randomUUID().slice(0, 8)}`;
    console.log(`[prodigi mock] ${args.merchantReference} → ${id} (${args.product.id})`);
    return { prodigiOrderId: id };
  }
  for (const asset of args.assets) assertPrinterCanFetch(asset.url);
  const sku = printSku(args.product);
  const productResponse = await prodigi(storeId, `/products/${encodeURIComponent(sku)}`);
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

  const response = await prodigi(storeId, "/orders", { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { order?: { id?: string } };
  if (!response.ok) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.order?.id;
  if (!id) throw new Error("Prodigi did not return an order id");
  return { prodigiOrderId: id };
}
