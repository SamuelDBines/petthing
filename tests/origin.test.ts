import assert from "node:assert/strict";
import test from "node:test";
import { publicOriginForStore } from "../lib/tenant/origin";

test("publicOriginForStore uses request host when it matches the store", () => {
  const brand = {
    appName: "WildFrame",
    tagline: "",
    siteDomain: "wildframe.studio",
    supportEmail: "hello@wildframe.studio",
    legalTradingName: "WildFrame",
    footerTradingDisclosure: "",
    emailFromName: "WildFrame",
    stripeStatementDescriptor: "WILDFRAME",
    referralPrefix: "WLD",
    logoPath: "/stores/wildframe-logo.svg",
    colors: {
      ink: "#000",
      cream: "#fff",
      pumpkin: "#000",
      gold: "#000",
      moss: "#000",
      bark: "#000",
      line: "#000",
    },
  };
  const request = new Request("https://wildframe.dropship.example/create", {
    headers: { host: "wildframe.dropship.example", "x-forwarded-proto": "https" },
  });
  const origin = publicOriginForStore(request, brand, "wildframe", ["wildframe.dropship.example"]);
  assert.equal(origin, "https://wildframe.dropship.example");
});

test("publicOriginForStore falls back to canonical site domain in production", () => {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NODE_ENV;
  env.NODE_ENV = "production";
  const brand = {
    appName: "WildFrame",
    tagline: "",
    siteDomain: "wildframe.studio",
    supportEmail: "hello@wildframe.studio",
    legalTradingName: "WildFrame",
    footerTradingDisclosure: "",
    emailFromName: "WildFrame",
    stripeStatementDescriptor: "WILDFRAME",
    referralPrefix: "WLD",
    logoPath: "/stores/wildframe-logo.svg",
    colors: {
      ink: "#000",
      cream: "#fff",
      pumpkin: "#000",
      gold: "#000",
      moss: "#000",
      bark: "#000",
      line: "#000",
    },
  };
  const request = new Request("https://pawtraitry.co.uk/", { headers: { host: "pawtraitry.co.uk" } });
  const origin = publicOriginForStore(request, brand, "wildframe", []);
  assert.equal(origin, "https://wildframe.studio");
  env.NODE_ENV = prev;
});
