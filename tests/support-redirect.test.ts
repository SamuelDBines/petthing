import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

test("pawtraitry /support redirects 308 to the Shopify contact page", () => {
  const res = middleware(new NextRequest("https://api.pawtraitry.com/support", { headers: { host: "api.pawtraitry.com" } }));
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), "https://pawtraitry.com/pages/contact");
});

test("other stores do not get the pawtraitry /support redirect", () => {
  const res = middleware(
    new NextRequest("https://fixmonger.dropship.store.bishop-co-tech.co.uk/support?store=fixmonger", {
      headers: { host: "fixmonger.dropship.store.bishop-co-tech.co.uk" },
    }),
  );
  assert.notEqual(res.headers.get("location"), "https://pawtraitry.com/pages/contact");
});
