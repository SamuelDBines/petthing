/**
 * Read-only Prodigi quote check for every Pawtraitry print SKU.
 *
 *   PRODIGI_SANDBOX_API_KEY=… npx tsx scripts/prodigi-quote-check.ts
 *
 * Uses the same quote line-item shape as lib/prodigi.ts (attributes + print areas).
 */
import { PRINTS } from "@/config/prints";
import {
  buildProdigiQuoteLineItem,
  parseProdigiProductDetails,
  validateProdigiLineItemAgainstProduct,
} from "@/lib/prodigi/print-payload";

const SANDBOX = "https://api.sandbox.prodigi.com/v4.0";

function apiKey() {
  return process.env.PRODIGI_SANDBOX_API_KEY?.trim() || process.env.PRODIGI_API_KEY?.trim() || "";
}

async function prodigiGet(path: string, key: string) {
  const response = await fetch(`${SANDBOX}${path}`, {
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function prodigiQuote(key: string, item: ReturnType<typeof buildProdigiQuoteLineItem>) {
  const response = await fetch(`${SANDBOX}/quotes`, {
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

  const failures: string[] = [];

  for (const product of PRINTS) {
    const item = buildProdigiQuoteLineItem(product);
    const { response: productResponse, body: productBody } = await prodigiGet(
      `/products/${encodeURIComponent(item.sku)}`,
      key,
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
    failures.push(...validateProdigiLineItemAgainstProduct(item, details));

    const { response: quoteResponse, body: quoteBody } = await prodigiQuote(key, item);
    const outcome = (quoteBody as { outcome?: string }).outcome;
    if (!quoteResponse.ok || (outcome && outcome !== "Created" && outcome !== "Ok")) {
      failures.push(
        `${product.id} (${item.sku}): quote rejected (${quoteResponse.status}) ${JSON.stringify(quoteBody).slice(0, 400)}`,
      );
    } else {
      console.log(`OK ${product.id} → ${item.sku}`);
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
