import assert from "node:assert/strict";
import test from "node:test";
import { pageRobotsNoindex, storeRequestIndexable } from "../lib/seo/page-robots";

test("pageRobotsNoindex respects SITE_NOINDEX on any host", () => {
  const prev = process.env.SITE_NOINDEX;
  process.env.SITE_NOINDEX = "true";
  try {
    assert.equal(pageRobotsNoindex("pawtraitry", "pawtraitry.com"), true);
    assert.equal(pageRobotsNoindex("pawtraitry", "localhost:3000"), true);
  } finally {
    if (prev === undefined) delete process.env.SITE_NOINDEX;
    else process.env.SITE_NOINDEX = prev;
  }
});

test("non-live stores stay noindex even on canonical host", () => {
  const prevLive = process.env.LIVE_STORES;
  delete process.env.SITE_NOINDEX;
  process.env.LIVE_STORES = "pawtraitry";
  try {
    assert.equal(pageRobotsNoindex("fixmonger", "fixmonger.com"), true);
    assert.equal(storeRequestIndexable("pawtraitry", "pawtraitry.com"), true);
    assert.equal(storeRequestIndexable("pawtraitry", "fixmonger.dropship.store.bishop-co-tech.co.uk"), false);
  } finally {
    if (prevLive === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prevLive;
  }
});

test("staging hostnames stay noindex for live store", () => {
  const prevLive = process.env.LIVE_STORES;
  delete process.env.SITE_NOINDEX;
  process.env.LIVE_STORES = "pawtraitry";
  try {
    assert.equal(pageRobotsNoindex("pawtraitry", "pawtraitry.dropship.store.bishop-co-tech.co.uk"), true);
  } finally {
    if (prevLive === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prevLive;
  }
});
