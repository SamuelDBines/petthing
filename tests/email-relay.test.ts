import assert from "node:assert/strict";
import test from "node:test";
import { isEmailStagingGateActive, stagingAllowsRecipient } from "../lib/email/config";
import { __setRelayEmailFetchForTests } from "../lib/email/providers/relayemail";
import { sendEmail } from "../lib/email/send";
import { __clearSuppressionMemoryForTests } from "../lib/email/suppressions";

test("staging gate blocks relay delivery to non-allowlisted addresses", async () => {
  const prev = { ...process.env };
  process.env.EMAIL_PROVIDER = "relayemail";
  process.env.RELAYEMAIL_API_KEY = "test-relay-key";
  process.env.EMAIL_FROM = "Test <orders@pawtraitry.com>";
  process.env.EMAIL_STAGING_GATE = "true";
  __clearSuppressionMemoryForTests();

  let posts = 0;
  __setRelayEmailFetchForTests(async () => {
    posts += 1;
    return new Response(JSON.stringify({ id: "relay-1", status: "sent" }), { status: 200 });
  });

  assert.equal(isEmailStagingGateActive({ storeId: "fixmonger", requestHost: "fixmonger.com" }), true);
  assert.equal(stagingAllowsRecipient("samuelbines@gmail.com"), true);
  assert.equal(stagingAllowsRecipient("customer@example.co.uk"), false);

  const blocked = await sendEmail({
    to: "customer@example.co.uk",
    subject: "Should not send",
    html: "<p>x</p>",
    storeId: "pawtraitry",
    stripeLivemode: false,
    requestHost: "pawtraitry.dropship.store.bishop-co-tech.co.uk",
  });
  assert.equal(blocked.sent, false);
  assert.equal(posts, 0);

  const allowed = await sendEmail({
    to: "samuelbines@gmail.com",
    subject: "Allowed",
    html: "<p>ok</p>",
    storeId: "pawtraitry",
    stripeLivemode: true,
    requestHost: "pawtraitry.com",
  });
  assert.equal(allowed.sent, true);
  assert.equal(posts, 1);
  assert.equal(allowed.provider, "relayemail");
  assert.equal(allowed.relayId, "relay-1");

  __setRelayEmailFetchForTests(null);
  Object.assign(process.env, prev);
});

test("relayemail provider sends JSON body with text fallback", async () => {
  const prev = { ...process.env };
  process.env.EMAIL_PROVIDER = "relayemail";
  process.env.RELAYEMAIL_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Pawtraitry <orders@pawtraitry.com>";
  process.env.EMAIL_STAGING_GATE = "false";
  __clearSuppressionMemoryForTests();

  let body: unknown;
  __setRelayEmailFetchForTests(async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ id: "r-99", sesMessageId: "ses-99", status: "sent" }), { status: 200 });
  });

  const result = await sendEmail({
    to: "buyer@example.com",
    subject: "Hi",
    html: "<p>Hello</p>",
    storeId: "pawtraitry",
    stripeLivemode: true,
  });
  assert.equal(result.sent, true);
  assert.equal((body as { text?: string }).text, "Hello");
  assert.equal(result.sesMessageId, "ses-99");

  __setRelayEmailFetchForTests(null);
  Object.assign(process.env, prev);
});
