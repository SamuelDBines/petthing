import assert from "node:assert/strict";
import test from "node:test";
import { samplePayload } from "../lib/email/templates/sample-data";
import { BUILTIN_STORES } from "../lib/tenant/defaults";
import { storeCanonicalOrigin, storePublicUrl } from "../lib/tenant/origin";

test("sample payloads use per-store refs and matching totals", () => {
  const pt = samplePayload("pawtraitry", "order_confirmation");
  assert.equal(pt.orderRef, "PT-DEMO01");
  assert.equal(pt.totalPence, pt.lines![0].unitPricePence);
  assert.equal(pt.subtotalPence, pt.totalPence);
  assert.equal(pt.hasPhysicalItems, false);

  const fm = samplePayload("fixmonger", "order_confirmation");
  assert.equal(fm.orderRef, "FM-DEMO01");
  assert.equal(fm.totalPence, fm.lines![0].unitPricePence);
  assert.ok(fm.lines![0].imageUrl?.startsWith("/stores/products/fixmonger/"));

  const jf = samplePayload("jinglefold", "shipped");
  assert.equal(jf.orderRef, "JF-DEMO01");
  assert.equal(jf.totalPence, (jf.subtotalPence ?? 0) + (jf.shippingPence ?? 0));
});

test("render rewrites sample asset paths onto canonical store host", () => {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NEXT_PUBLIC_APP_URL;
  env.NEXT_PUBLIC_APP_URL = "https://dropship.store.bishop-co-tech.co.uk";
  const config = BUILTIN_STORES.find((s) => s.id === "fixmonger")!;
  const origin = storeCanonicalOrigin("fixmonger", config.brand, [
    ...config.domains,
    "fixmonger.dropship.store.bishop-co-tech.co.uk",
  ]);
  assert.match(origin, /fixmonger\.dropship\.store/);
  const fm = samplePayload("fixmonger", "order_confirmation");
  const image = storePublicUrl(origin, fm.lines![0].imageUrl!);
  assert.match(image, /^https:\/\/fixmonger\.dropship\.store/);
  assert.match(image, /HOM-76459\.webp$/);
  env.NEXT_PUBLIC_APP_URL = prev;
});
