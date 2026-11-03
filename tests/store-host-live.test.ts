import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { SITEMAP_PATHS_BY_STORE } from "../lib/seo/sitemap-paths";
import { storeLiveOnCanonicalHost } from "../lib/go-live/store-host-live";

function appPageExists(routePath: string) {
  const root = path.join(process.cwd(), "app");
  if (routePath === "/") return existsSync(path.join(root, "page.tsx"));
  const segment = routePath.replace(/^\//, "");
  return existsSync(path.join(root, segment, "page.tsx"));
}

test("sitemap paths map to real app pages for each store", () => {
  for (const [storeId, paths] of Object.entries(SITEMAP_PATHS_BY_STORE)) {
    for (const routePath of paths) {
      assert.ok(appPageExists(routePath), `${storeId} sitemap path ${routePath} has no app page`);
    }
  }
});

test("pawtraitry is live only on canonical host", () => {
  const prev = process.env.LIVE_STORES;
  process.env.LIVE_STORES = "pawtraitry";
  try {
    assert.equal(storeLiveOnCanonicalHost("pawtraitry", "pawtraitry.com"), true);
    assert.equal(storeLiveOnCanonicalHost("pawtraitry", "www.pawtraitry.com"), true);
    assert.equal(storeLiveOnCanonicalHost("pawtraitry", "pawtraitry.dropship.store.bishop-co-tech.co.uk"), false);
  } finally {
    if (prev === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev;
  }
});
