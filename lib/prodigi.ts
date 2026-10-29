import { printSku, type PrintProduct } from "@/config/prints";
import type { Shipping } from "@/lib/domain";
import { prodigiApiKeyForStore, prodigiUsesLiveApi, type ProdigiRuntimeOpts } from "@/lib/prodigi/config";
import { buildProdigiOrderLineItem, buildProdigiQuoteLineItem } from "@/lib/prodigi/print-payload";

function prodigiOpts(args: { storeId: string; stripeLivemode?: boolean | null; host?: string }): ProdigiRuntimeOpts {
  return { stripeLivemode: args.stripeLivemode, host: args.host };
}

export type ProdigiAvailability =
  | { ok: true }
  | { ok: false; reason: "live_key_missing" | "sandbox_key_missing" };

export function prodigiAvailability(storeId: string, opts?: ProdigiRuntimeOpts): ProdigiAvailability {
  if (prodigiUsesLiveApi(storeId, opts)) {
    return prodigiApiKeyForStore(storeId, opts) ? { ok: true } : { ok: false, reason: "live_key_missing" };
  }
  return prodigiApiKeyForStore(storeId, opts) ? { ok: true } : { ok: false, reason: "sandbox_key_missing" };
}

export function prodigiUnavailableMessage(storeId: string, opts?: ProdigiRuntimeOpts): string | null {
  const avail = prodigiAvailability(storeId, opts);
  if (avail.ok) return null;
  return avail.reason === "sandbox_key_missing"
    ? "Prodigi sandbox API key missing (set PRODIGI_SANDBOX_API_KEY)"
    : "Prodigi live API key missing (set PRODIGI_API_KEY)";
}

export function prodigiMocked(storeId: string, opts?: ProdigiRuntimeOpts) {
  return !prodigiAvailability(storeId, opts).ok;
}

function baseUrl(storeId: string, opts?: ProdigiRuntimeOpts) {
  if (prodigiUsesLiveApi(storeId, opts)) return "https://api.prodigi.com/v4.0";
  return "https://api.sandbox.prodigi.com/v4.0";
}

async function prodigi(storeId: string, path: string, opts: ProdigiRuntimeOpts | undefined, init?: RequestInit) {
  const key = prodigiApiKeyForStore(storeId, opts);
  if (!key) throw new Error("Prodigi API key is not set for this store");
  const response = await fetch(`${baseUrl(storeId, opts)}${path}`, {
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
  const opts = prodigiOpts({ storeId });
  const unavailable = prodigiUnavailableMessage(storeId, opts);
  if (unavailable) throw new Error(unavailable);
  const lineItem = buildProdigiQuoteLineItem(args.product, args.items ?? 1);
  const response = await prodigi(storeId, "/quotes", opts, {
    method: "POST",
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: args.countryCode,
      items: [lineItem],
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

export async function fetchProdigiOrder(
  orderId: string,
  storeId = "pawtraitry",
  opts?: ProdigiRuntimeOpts,
) {
  const unavailable = prodigiUnavailableMessage(storeId, opts);
  if (unavailable) throw new Error(unavailable);
  const response = await prodigi(storeId, `/orders/${encodeURIComponent(orderId)}`, opts);
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

/**
 * Look up an existing Prodigi order by our merchantReference (we use the print row id).
 * Returns null when Prodigi has no live (non-cancelled) order for that reference.
 * Throws when Prodigi cannot be asked, so callers can avoid refunding or re-ordering blind.
 */
export async function findProdigiOrderByMerchantReference(
  merchantReference: string,
  storeId = "pawtraitry",
  opts?: ProdigiRuntimeOpts,
): Promise<{ prodigiOrderId: string; stage: string } | null> {
  const unavailable = prodigiUnavailableMessage(storeId, opts);
  if (unavailable) throw new Error(unavailable);
  const response = await prodigi(
    storeId,
    `/orders?top=10&merchantReferences=${encodeURIComponent(merchantReference)}`,
    opts,
  );
  if (!response.ok) throw new Error(`Prodigi order lookup failed (${response.status})`);
  const payload = (await response.json().catch(() => ({}))) as {
    orders?: { id?: string; merchantReference?: string; status?: { stage?: string } }[];
  };
  const match = (payload.orders ?? []).find(
    (o) => o.id && o.merchantReference === merchantReference && o.status?.stage !== "Cancelled",
  );
  return match?.id ? { prodigiOrderId: match.id, stage: match.status?.stage ?? "unknown" } : null;
}

export async function submitMerchandiseOrder(args: {
  storeId?: string;
  sku: string;
  shipping: Shipping;
  assetUrl: string;
  printArea: string;
  merchantReference: string;
  copies?: number;
  stripeLivemode?: boolean | null;
}) {
  const storeId = args.storeId ?? "jinglefold";
  const opts = prodigiOpts({ storeId, stripeLivemode: args.stripeLivemode });
  const unavailable = prodigiUnavailableMessage(storeId, opts);
  if (unavailable) throw new Error(unavailable);
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
  const response = await prodigi(storeId, "/orders", opts, { method: "POST", body: JSON.stringify(body) });
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
  stripeLivemode?: boolean | null;
  product: PrintProduct;
  shipping: Shipping;
  assets: { printArea: string; url: string }[];
  merchantReference: string;
}) {
  const storeId = args.storeId ?? "pawtraitry";
  const opts = prodigiOpts({ storeId, stripeLivemode: args.stripeLivemode });
  const unavailable = prodigiUnavailableMessage(storeId, opts);
  if (unavailable) throw new Error(unavailable);
  for (const asset of args.assets) assertPrinterCanFetch(asset.url);
  const sku = printSku(args.product);
  const productResponse = await prodigi(storeId, `/products/${encodeURIComponent(sku)}`, opts);
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
      buildProdigiOrderLineItem({
        product: args.product,
        assets: args.assets,
        merchantReference: args.merchantReference,
      }),
    ],
  };

  const response = await prodigi(storeId, "/orders", opts, { method: "POST", body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => ({}))) as { order?: { id?: string } };
  if (!response.ok) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  const id = payload.order?.id;
  if (!id) throw new Error("Prodigi did not return an order id");
  return { prodigiOrderId: id };
}
