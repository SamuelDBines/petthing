import assert from "node:assert/strict";
import test from "node:test";
import { integrations, metaIntegrationFlags } from "../lib/runtime";

test("metaIntegrationFlags uses per-store META_PIXEL_ID and META_CAPI_TOKEN", () => {
  const prev = {
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    META_PIXEL_ID_PAWTRAITRY: process.env.META_PIXEL_ID_PAWTRAITRY,
    META_CAPI_TOKEN_PAWTRAITRY: process.env.META_CAPI_TOKEN_PAWTRAITRY,
    LIVE_STORES: process.env.LIVE_STORES,
  };
  try {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    process.env.META_PIXEL_ID_PAWTRAITRY = "1234567890";
    process.env.META_CAPI_TOKEN_PAWTRAITRY = "secret-token";
    process.env.LIVE_STORES = "pawtraitry";
    const flags = metaIntegrationFlags();
    assert.equal(flags.metaPixel, true);
    assert.equal(flags.metaCapi, true);
  } finally {
    if (prev.NEXT_PUBLIC_META_PIXEL_ID === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = prev.NEXT_PUBLIC_META_PIXEL_ID;
    if (prev.META_PIXEL_ID_PAWTRAITRY === undefined) delete process.env.META_PIXEL_ID_PAWTRAITRY;
    else process.env.META_PIXEL_ID_PAWTRAITRY = prev.META_PIXEL_ID_PAWTRAITRY;
    if (prev.META_CAPI_TOKEN_PAWTRAITRY === undefined) delete process.env.META_CAPI_TOKEN_PAWTRAITRY;
    else process.env.META_CAPI_TOKEN_PAWTRAITRY = prev.META_CAPI_TOKEN_PAWTRAITRY;
    if (prev.LIVE_STORES === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev.LIVE_STORES;
  }
});

test("integrations never exposes Meta secret values", () => {
  const prev = {
    META_CAPI_TOKEN_PAWTRAITRY: process.env.META_CAPI_TOKEN_PAWTRAITRY,
    META_PIXEL_ID_PAWTRAITRY: process.env.META_PIXEL_ID_PAWTRAITRY,
    LIVE_STORES: process.env.LIVE_STORES,
  };
  try {
    process.env.META_CAPI_TOKEN_PAWTRAITRY = "super-secret";
    process.env.META_PIXEL_ID_PAWTRAITRY = "999";
    process.env.LIVE_STORES = "pawtraitry";
    const row = integrations();
    assert.equal(row.metaCapi, true);
    assert.equal(row.metaPixel, true);
    assert.notEqual((row as { metaCapi: unknown }).metaCapi, "super-secret");
  } finally {
    if (prev.META_CAPI_TOKEN_PAWTRAITRY === undefined) delete process.env.META_CAPI_TOKEN_PAWTRAITRY;
    else process.env.META_CAPI_TOKEN_PAWTRAITRY = prev.META_CAPI_TOKEN_PAWTRAITRY;
    if (prev.META_PIXEL_ID_PAWTRAITRY === undefined) delete process.env.META_PIXEL_ID_PAWTRAITRY;
    else process.env.META_PIXEL_ID_PAWTRAITRY = prev.META_PIXEL_ID_PAWTRAITRY;
    if (prev.LIVE_STORES === undefined) delete process.env.LIVE_STORES;
    else process.env.LIVE_STORES = prev.LIVE_STORES;
  }
});
