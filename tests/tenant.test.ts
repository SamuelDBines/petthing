import test from "node:test";
import assert from "node:assert/strict";
import { resolveStoreIdFromHost } from "../lib/tenant/resolve";

test("hostname maps to store", () => {
  assert.equal(resolveStoreIdFromHost("pawtraitry.localhost:3000"), "pawtraitry");
  assert.equal(resolveStoreIdFromHost("wildframe.localhost:3000"), "wildframe");
  assert.equal(resolveStoreIdFromHost("unknown.example"), "pawtraitry");
});

test("dev store query override", () => {
  assert.equal(resolveStoreIdFromHost("localhost:3000", "wildframe"), "wildframe");
});

test("extra domains from env resolve store", () => {
  const prev = process.env.STORE_EXTRA_DOMAINS;
  process.env.STORE_EXTRA_DOMAINS = JSON.stringify({
    pawtraitry: ["dropship.store.bishop-co-tech.co.uk"],
    wildframe: ["wildframe.dropship.store.bishop-co-tech.co.uk"],
  });
  assert.equal(resolveStoreIdFromHost("dropship.store.bishop-co-tech.co.uk"), "pawtraitry");
  assert.equal(resolveStoreIdFromHost("wildframe.dropship.store.bishop-co-tech.co.uk"), "wildframe");
  process.env.STORE_EXTRA_DOMAINS = prev;
});
