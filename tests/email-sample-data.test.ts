import assert from "node:assert/strict";
import test from "node:test";
import { samplePayload } from "../lib/email/templates/sample-data";

test("sample payloads use per-store refs and matching totals", () => {
  const pt = samplePayload("pawtraitry", "order_confirmation");
  assert.equal(pt.orderRef, "PT-DEMO01");
  assert.equal(pt.totalPence, pt.lines![0].unitPricePence);
  assert.equal(pt.subtotalPence, pt.totalPence);
  assert.ok(pt.lines![0].imageUrl?.includes("pawtraitry.com"));
  assert.equal(pt.hasPhysicalItems, false);

  const fm = samplePayload("fixmonger", "order_confirmation");
  assert.equal(fm.orderRef, "FM-DEMO01");
  assert.equal(fm.totalPence, fm.lines![0].unitPricePence);
  assert.ok(fm.lines![0].imageUrl?.includes("HOM-76459"));
  assert.ok(fm.lines![0].imageUrl?.includes("fixmonger"));

  const jf = samplePayload("jinglefold", "shipped");
  assert.equal(jf.orderRef, "JF-DEMO01");
  assert.equal(jf.totalPence, (jf.subtotalPence ?? 0) + (jf.shippingPence ?? 0));
});
