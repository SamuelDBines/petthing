import assert from "node:assert/strict";
import test from "node:test";
import { pageRobotsNoindex } from "../lib/seo/page-robots";

test("pageRobotsNoindex respects SITE_NOINDEX on any host", () => {
  const prev = process.env.SITE_NOINDEX;
  process.env.SITE_NOINDEX = "true";
  try {
    assert.equal(pageRobotsNoindex("pawtraitry.com"), true);
    assert.equal(pageRobotsNoindex("localhost:3000"), true);
  } finally {
    if (prev === undefined) delete process.env.SITE_NOINDEX;
    else process.env.SITE_NOINDEX = prev;
  }
});

test("pageRobotsNoindex still noindexes staging hostnames without SITE_NOINDEX", () => {
  const prev = process.env.SITE_NOINDEX;
  delete process.env.SITE_NOINDEX;
  try {
    assert.equal(pageRobotsNoindex("fixmonger.dropship.store.bishop-co-tech.co.uk"), true);
    assert.equal(pageRobotsNoindex("pawtraitry.com"), false);
  } finally {
    if (prev !== undefined) process.env.SITE_NOINDEX = prev;
  }
});
