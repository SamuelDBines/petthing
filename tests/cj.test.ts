import test from "node:test";
import assert from "node:assert/strict";
import { cjCreateOrderV2, cjListProductsGb } from "../lib/suppliers/cj";

test("CJ adapter mocks without token", async () => {
  const prev = process.env.CJ_ACCESS_TOKEN;
  delete process.env.CJ_ACCESS_TOKEN;
  const list = await cjListProductsGb();
  assert.equal(list.mocked, true);
  const created = await cjCreateOrderV2({
    id: "22222222-2222-2222-2222-222222222222",
    storeId: "fixmonger",
    email: "a@b.com",
    status: "paid",
    lines: [],
    shipping: {
      name: "Sam",
      line1: "1 High St",
      line2: "",
      city: "London",
      postalCode: "SW1A 1AA",
      countryCode: "GB",
    },
    amountPence: 100,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  });
  assert.match(created.cjOrderId, /^mock_cj_/);
  process.env.CJ_ACCESS_TOKEN = prev;
});
