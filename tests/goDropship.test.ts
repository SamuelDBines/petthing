import test from "node:test";
import assert from "node:assert/strict";
import { buildGoDropshipCsv } from "../lib/suppliers/goDropship";
import type { ShopOrder } from "../lib/catalogue/types";

test("buildGoDropshipCsv includes SKU and UK address", () => {
  const order: ShopOrder = {
    id: "11111111-1111-1111-1111-111111111111",
    storeId: "fixmonger",
    email: "sam@example.com",
    status: "paid",
    lines: [
      {
        productId: "hom-76459",
        name: "Curtain",
        supplierSku: "HOM-76459",
        supplier: "go_dropship",
        quantity: 2,
        unitPricePence: 2999,
        costPence: 1199,
      },
    ],
    shipping: {
      name: "Sam",
      line1: "1 High St",
      line2: "",
      city: "London",
      postalCode: "SW1A 1AA",
      countryCode: "GB",
    },
    amountPence: 5998,
    shippingPence: 0,
    stripeCheckoutSessionId: null,
    trackingNumber: null,
    supplierBatchId: null,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  };
  const csv = buildGoDropshipCsv([order]);
  assert.match(csv, /HOM-76459/);
  assert.match(csv, /SW1A 1AA/);
  assert.match(csv, /,2,/);
});
