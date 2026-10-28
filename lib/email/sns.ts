import MessageValidator from "sns-validator";

const validator = new MessageValidator();

const DEFAULT_ALLOWED_TOPIC_ARNS: string[] = [];

export function sesSnsAllowedTopicArns(): string[] {
  const raw = process.env.SES_SNS_TOPIC_ARNS?.trim();
  if (!raw) return DEFAULT_ALLOWED_TOPIC_ARNS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedSesSnsTopic(topicArn: unknown) {
  const allowed = sesSnsAllowedTopicArns();
  if (!allowed.length) return true;
  if (typeof topicArn !== "string" || !topicArn.trim()) return false;
  return allowed.includes(topicArn.trim());
}

export async function parseVerifiedSnsBody(raw: string) {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  await new Promise<void>((resolve, reject) => {
    validator.validate(parsed, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
  return parsed;
}

export type SesBounceNotification = {
  notificationType?: string;
  bounce?: { bouncedRecipients?: { emailAddress?: string }[] };
  complaint?: { complainedRecipients?: { emailAddress?: string }[] };
};

export function suppressedAddressesFromSesMessage(message: SesBounceNotification) {
  const out: { email: string; reason: string }[] = [];
  const type = message.notificationType?.toLowerCase();
  if (type === "bounce" && message.bounce?.bouncedRecipients) {
    for (const row of message.bounce.bouncedRecipients) {
      if (row.emailAddress) out.push({ email: row.emailAddress, reason: "bounce" });
    }
  }
  if (type === "complaint" && message.complaint?.complainedRecipients) {
    for (const row of message.complaint.complainedRecipients) {
      if (row.emailAddress) out.push({ email: row.emailAddress, reason: "complaint" });
    }
  }
  return out;
}
