import test from "node:test";
import assert from "node:assert/strict";
import { mergePersons } from "../lib/crm/merge-persons";
import type { Order } from "../lib/domain";
import { GoliveResetBlockedError, resolveStoreScope } from "../lib/golive/reset";

test("mergePersons sums new and returning to unique visitors", () => {
  const people = mergePersons({
    orders: [
      {
        id: "1",
        storeId: "pawtraitry",
        email: "sam@example.com",
        createdAt: "2026-10-01T10:00:00.000Z",
        status: "delivered",
        amountPence: 1999,
        payments: [{ sessionId: "demo_1", paymentIntentId: null, amountPence: 1999, kind: "portrait", createdAt: "2026-10-01T10:00:00.000Z" }],
      } as unknown as Order,
      {
        id: "2",
        storeId: "pawtraitry",
        email: "sam@example.com",
        createdAt: "2026-10-02T10:00:00.000Z",
        status: "pending_payment",
        amountPence: 1999,
        payments: [],
      } as unknown as Order,
    ],
    shopOrders: [],
    preorders: [],
    signups: [],
    suppressed: new Set(),
  });
  assert.equal(people.length, 1);
  assert.equal(people[0]?.orderCount, 2);
  assert.equal(people[0]?.paidOrderCount, 1);
  assert.equal(people[0]?.status, "customer");
});

test("resolveStoreScope accepts slug or id", () => {
  assert.deepEqual(resolveStoreScope("fixmonger"), ["fixmonger"]);
});

test("GoliveResetBlockedError is named for safety handling", () => {
  const error = new GoliveResetBlockedError("blocked");
  assert.equal(error.name, "GoliveResetBlockedError");
});
