/**
 * Read-only Prodigi quote check for every Pawtraitry print SKU.
 *
 *   PRODIGI_API_KEY=… PRODIGI_BASE_URL=https://api.prodigi.com/v4.0 npx tsx scripts/prodigi-quote-check.ts
 *
 * Uses the same quote line-item shape as lib/prodigi.ts (attributes + print areas).
 */
import { PRINTS } from "@/config/prints";
import { prodigiStaticImplicitAttributes } from "@/config/prodigi-print-attributes";
import {
  buildProdigiQuoteLineItem,
  parseProdigiProductDetails,
  validateProdigiLineItemAgainstProduct,
  validateStaticImplicitAgainstProductDetails,
} from "@/lib/prodigi/print-payload";

const DEFAULT_BASE = "https://api.sandbox.prodigi.com/v4.0";

function prodigiBaseUrl() {
  const raw = process.env.PRODIGI_BASE_URL?.trim() || DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

function apiKey() {
  return process.env.PRODIGI_SANDBOX_API_KEY?.trim() || process.env.PRODIGI_API_KEY?.trim() || "";
}

function quoteCostLabel(body: unknown): string {
  const quotes = (body as { quotes?: { costSummary?: Record<string, { amount?: string; currency?: string }> }[] })
    .quotes;
  const summary = quotes?.[0]?.costSummary;
  if (!summary) return "";
  const total = summary.totalCost;
  if (total?.amount && total.currency) return `${total.currency} ${total.amount}`;
  const items = summary.items;
  const shipping = summary.shipping;
  if (items?.amount && items.currency) {
    const ship =
      shipping?.amount && shipping.currency ? ` + ship ${shipping.currency} ${shipping.amount}` : "";
    return `${items.currency} ${items.amount}${ship}`;
  }
  return "";
}

async function prodigiGet(path: string, key: string, base: string) {
  const response = await fetch(`${base}${path}`, {
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function prodigiQuote(key: string, base: string, item: ReturnType<typeof buildProdigiQuoteLineItem>) {
  const response = await fetch(`${base}/quotes`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: "GB",
      items: [item],
    }),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.log("No PRODIGI_SANDBOX_API_KEY or PRODIGI_API_KEY — skipping live quotes (script typechecks only).");
    process.exit(0);
  }

  const base = prodigiBaseUrl();
  console.log(`Prodigi base: ${base}`);

  const failures: string[] = [];

  for (const product of PRINTS) {
    const item = buildProdigiQuoteLineItem(product);
    const { response: productResponse, body: productBody } = await prodigiGet(
      `/products/${encodeURIComponent(item.sku)}`,
      key,
      base,
    );
    if (!productResponse.ok) {
      failures.push(`${product.id} (${item.sku}): product lookup ${productResponse.status}`);
      continue;
    }
    const details = parseProdigiProductDetails(productBody);
    if (!details) {
      failures.push(`${product.id} (${item.sku}): could not parse product details`);
      continue;
    }
    failures.push(...validateStaticImplicitAgainstProductDetails(
      product.defaultSku,
      item.sku,
      details,
      prodigiStaticImplicitAttributes(item.sku, product.defaultSku),
    ));
    failures.push(...validateProdigiLineItemAgainstProduct(item, details));

    const { response: quoteResponse, body: quoteBody } = await prodigiQuote(key, base, item);
    const outcome = (quoteBody as { outcome?: string }).outcome;
    if (!quoteResponse.ok || (outcome && outcome !== "Created" && outcome !== "Ok")) {
      failures.push(
        `${product.id} (${item.sku}): quote rejected (${quoteResponse.status}) ${JSON.stringify(quoteBody).slice(0, 400)}`,
      );
    } else {
      const cost = quoteCostLabel(quoteBody);
      console.log(`OK ${product.id} → ${item.sku}${cost ? ` · ${cost}` : ""}`);
    }
  }

  if (failures.length) {
    console.error("Prodigi quote check failed:\n" + failures.map((line) => `  - ${line}`).join("\n"));
    process.exit(1);
  }
  console.log(`All ${PRINTS.length} print SKUs quoted successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
