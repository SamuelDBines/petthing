import assert from "node:assert/strict";
import test from "node:test";
import {
  emailProviderId,
  formatFromHeader,
  parseFromHeader,
  resolveFromAddress,
  stagingAllowsRecipient,
} from "../lib/email/config";
import { __setSesClientsForTests } from "../lib/email/providers/ses";
import { sendEmail } from "../lib/email/send";
import { __clearSuppressionMemoryForTests, isEmailSuppressed, suppressEmail } from "../lib/email/suppressions";
import { suppressedAddressesFromSesMessage } from "../lib/email/sns";

test("emailProviderId prefers SES when AWS_SES_REGION is set", () => {
  const prev = { ...process.env };
  process.env.EMAIL_PROVIDER = "";
  process.env.AWS_SES_REGION = "eu-west-2";
  delete process.env.RESEND_API_KEY;
  assert.equal(emailProviderId(), "ses");
  process.env.EMAIL_PROVIDER = prev.EMAIL_PROVIDER;
  process.env.AWS_SES_REGION = prev.AWS_SES_REGION;
  process.env.RESEND_API_KEY = prev.RESEND_API_KEY;
});

test("stagingAllowsRecipient permits owner and example.com sinks", () => {
  assert.equal(stagingAllowsRecipient("samuelbines@gmail.com"), true);
  assert.equal(stagingAllowsRecipient("user@example.com"), true);
  assert.equal(stagingAllowsRecipient("random@customer.co.uk"), false);
});

test("resolveFromAddress uses per-store override env", async () => {
  const prev = process.env.EMAIL_FROM_FIXMONGER;
  process.env.EMAIL_FROM = "Pawtraitry <hello@pawtraitry.co.uk>";
  process.env.EMAIL_FROM_FIXMONGER = "Fixmonger <orders@fixmonger.co.uk>";
  const from = await resolveFromAddress("fixmonger");
  assert.equal(from, "Fixmonger <orders@fixmonger.co.uk>");
  if (prev) process.env.EMAIL_FROM_FIXMONGER = prev;
  else delete process.env.EMAIL_FROM_FIXMONGER;
});

test("parseFromHeader and formatFromHeader round-trip", () => {
  const parsed = parseFromHeader('Fixmonger <orders@fixmonger.co.uk>');
  assert.equal(parsed.email, "orders@fixmonger.co.uk");
  assert.equal(formatFromHeader("Fixmonger", "orders@fixmonger.co.uk"), "Fixmonger <orders@fixmonger.co.uk>");
});

test("sendEmail delivers via mocked SES", async () => {
  const prev = { ...process.env };
  process.env.EMAIL_PROVIDER = "ses";
  process.env.EMAIL_FROM = "Test <hello@example.com>";
  process.env.AWS_ACCESS_KEY_ID = "test-key";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
  process.env.AWS_SES_REGION = "eu-west-2";
  process.env.EMAIL_STAGING_GATE = "false";
  __clearSuppressionMemoryForTests();

  let sent = 0;
  __setSesClientsForTests(() => ({
    sesv2: {
      send: async () => {
        sent += 1;
        return { MessageId: "ses-msg-1" };
      },
    } as never,
    ses: { send: async () => ({ MessageId: "raw-1" }) } as never,
  }));

  const result = await sendEmail({
    to: "buyer@example.com",
    subject: "Hello",
    html: "<p>Hi</p>",
    storeId: "fixmonger",
  });
  assert.equal(result.sent, true);
  assert.equal(sent, 1);

  __setSesClientsForTests(null);
  process.env.EMAIL_PROVIDER = prev.EMAIL_PROVIDER;
  process.env.EMAIL_FROM = prev.EMAIL_FROM;
  process.env.AWS_ACCESS_KEY_ID = prev.AWS_ACCESS_KEY_ID;
  process.env.AWS_SECRET_ACCESS_KEY = prev.AWS_SECRET_ACCESS_KEY;
  process.env.AWS_SES_REGION = prev.AWS_SES_REGION;
  process.env.EMAIL_STAGING_GATE = prev.EMAIL_STAGING_GATE;
});

test("suppressed addresses block send", async () => {
  const prev = { ...process.env };
  process.env.EMAIL_PROVIDER = "ses";
  process.env.EMAIL_FROM = "Test <hello@example.com>";
  process.env.AWS_ACCESS_KEY_ID = "test-key";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
  process.env.EMAIL_STAGING_GATE = "false";
  __clearSuppressionMemoryForTests();
  await suppressEmail("blocked@example.com", "bounce");

  let sent = 0;
  __setSesClientsForTests(() => ({
    sesv2: { send: async () => { sent += 1; return {}; } } as never,
    ses: { send: async () => ({}) } as never,
  }));

  const result = await sendEmail({ to: "blocked@example.com", subject: "x", html: "y" });
  assert.equal(result.sent, false);
  assert.equal(sent, 0);
  assert.equal(await isEmailSuppressed("blocked@example.com"), true);

  __setSesClientsForTests(null);
  __clearSuppressionMemoryForTests();
  Object.assign(process.env, prev);
});

test("SES bounce notification extracts recipients", () => {
  const rows = suppressedAddressesFromSesMessage({
    notificationType: "Bounce",
    bounce: { bouncedRecipients: [{ emailAddress: "bad@example.com" }] },
  });
  assert.deepEqual(rows, [{ email: "bad@example.com", reason: "bounce" }]);
});
