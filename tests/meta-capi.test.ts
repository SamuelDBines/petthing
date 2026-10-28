import assert from "node:assert/strict";
import test from "node:test";
import { __setMetaCapiFetchForTests, sendMetaCapiEvent } from "../lib/meta/capi";

test("sendMetaCapiEvent skips without marketing consent", async () => {
  const result = await sendMetaCapiEvent({
    storeId: "pawtraitry",
    eventName: "Purchase",
    eventId: "evt_1",
    marketingConsent: false,
  });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "no_consent");
});

test("sendMetaCapiEvent posts Purchase with hashed email when configured", async () => {
  const calls: { url: string; body: string }[] = [];
  __setMetaCapiFetchForTests(async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  });
  const result = await sendMetaCapiEvent(
    {
      storeId: "pawtraitry",
      requestHost: "pawtraitry.com",
      eventName: "Purchase",
      eventId: "purchase-abc",
      marketingConsent: true,
      userData: {
        email: "Sam@Example.com",
        clientIpAddress: "203.0.113.10",
        clientUserAgent: "Mozilla/5.0",
        fbp: "fb.1.1.abc",
        fbc: "fb.1.2.click",
      },
      customData: { value: 29.99, currency: "GBP", contentIds: ["classic"] },
    },
    { ...process.env, LIVE_STORES: "pawtraitry", META_PIXEL_ID_PAWTRAITRY: "123456789", META_CAPI_TOKEN_PAWTRAITRY: "token" },
  );
  __setMetaCapiFetchForTests(null);
  assert.equal(result.sent, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /123456789\/events/);
  const payload = JSON.parse(calls[0].body) as { data: { event_id: string; user_data: { em: string[] } }[] };
  assert.equal(payload.data[0].event_id, "purchase-abc");
  assert.ok(payload.data[0].user_data.em[0]);
  assert.notEqual(payload.data[0].user_data.em[0], "Sam@Example.com");
});

test("sendMetaCapiEvent skips on non-canonical host without test code", async () => {
  const result = await sendMetaCapiEvent(
    {
      storeId: "pawtraitry",
      requestHost: "pawtraitry.dropship.store.bishop-co-tech.co.uk",
      eventName: "Lead",
      eventId: "lead-1",
      marketingConsent: true,
    },
    { ...process.env, LIVE_STORES: "pawtraitry", META_PIXEL_ID_PAWTRAITRY: "123", META_CAPI_TOKEN_PAWTRAITRY: "tok" },
  );
  assert.equal(result.sent, false);
  assert.equal(result.reason, "staging");
});
