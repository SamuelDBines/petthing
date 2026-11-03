import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedSesSnsTopic, sesSnsAllowedTopicArns } from "../lib/email/sns";

test("SES SNS TopicArn allowlist blocks unknown topics when configured", () => {
  const prev = process.env.SES_SNS_TOPIC_ARNS;
  process.env.SES_SNS_TOPIC_ARNS = "arn:aws:sns:eu-west-2:123:ses-bounces";
  assert.deepEqual(sesSnsAllowedTopicArns(), ["arn:aws:sns:eu-west-2:123:ses-bounces"]);
  assert.equal(isAllowedSesSnsTopic("arn:aws:sns:eu-west-2:123:ses-bounces"), true);
  assert.equal(isAllowedSesSnsTopic("arn:aws:sns:eu-west-2:999:other"), false);
  if (prev) process.env.SES_SNS_TOPIC_ARNS = prev;
  else delete process.env.SES_SNS_TOPIC_ARNS;
});

test("resolveFromAddress uses EMAIL_FROM_FIXMONGER override env", async () => {
  const { resolveFromAddress } = await import("../lib/email/store-senders");
  const prev = process.env.EMAIL_FROM_FIXMONGER;
  process.env.EMAIL_FROM = "Pawtraitry <hello@pawtraitry.com>";
  process.env.EMAIL_FROM_FIXMONGER = "Fixmonger <orders@fixmonger.co.uk>";
  const from = await resolveFromAddress("fixmonger");
  assert.equal(from, "Fixmonger <orders@fixmonger.co.uk>");
  if (prev) process.env.EMAIL_FROM_FIXMONGER = prev;
  else delete process.env.EMAIL_FROM_FIXMONGER;
});
