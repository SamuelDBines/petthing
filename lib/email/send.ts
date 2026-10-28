import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { localDataPath } from "@/lib/localPaths";
import {
  emailProviderId,
  isEmailStagingGateActive,
  stagingAllowsRecipient,
} from "@/lib/email/config";
import { resolveFromAddress, resolveReplyToAddress } from "@/lib/email/store-senders";
import { sendViaRelayEmail } from "@/lib/email/providers/relayemail";
import { sendViaResend } from "@/lib/email/providers/resend";
import { sendViaSes } from "@/lib/email/providers/ses";
import { isEmailSuppressed } from "@/lib/email/suppressions";
import type { EmailMessage, EmailSendResult } from "@/lib/email/types";

export type { EmailMessage, EmailSendResult } from "@/lib/email/types";

async function writeOutbox(message: EmailMessage, meta?: Record<string, string>) {
  const dir = localDataPath("outbox");
  await mkdir(dir, { recursive: true });
  const slug = message.to.replace(/[^a-z0-9@._-]/gi, "_");
  const filename = `${Date.now()}-${slug}.html`;
  await writeFile(path.join(dir, filename), `<!-- ${message.subject} -->\n${message.html}`);
  if (meta && Object.keys(meta).length) {
    await writeFile(
      path.join(dir, `${Date.now()}-${slug}.meta.json`),
      JSON.stringify(meta, null, 2),
    );
  }
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  await writeOutbox(message);
  console.log(`[email] ${message.to} — ${message.subject}`);

  if (await isEmailSuppressed(message.to)) {
    console.log(`[email] suppressed ${message.to}`);
    return { sent: false };
  }

  if (isEmailStagingGateActive() && !stagingAllowsRecipient(message.to)) {
    console.log(`[email] staging gate blocked delivery to ${message.to}`);
    return { sent: false };
  }

  const provider = emailProviderId();
  if (provider === "none") return { sent: false };

  const fromRole = message.fromRole ?? "orders";
  const from = await resolveFromAddress(message.storeId, fromRole);
  if (!from) throw new Error("EMAIL_FROM is required when a mail provider is configured");

  const replyTo = message.replyTo ?? (await resolveReplyToAddress(message.storeId));

  if (provider === "relayemail") {
    const result = await sendViaRelayEmail(message, from, replyTo);
    await writeOutbox(message, {
      relayId: result.id,
      sesMessageId: result.sesMessageId ?? "",
      status: result.status,
    });
    return {
      sent: true,
      provider: "relayemail",
      messageId: result.id,
      relayId: result.id,
      sesMessageId: result.sesMessageId,
      status: result.status,
    };
  }

  if (provider === "ses") {
    const result = await sendViaSes(message, from, replyTo);
    return { sent: true, provider: "ses", messageId: result.messageId };
  }

  const result = await sendViaResend(message, from);
  return { sent: true, provider: "resend", messageId: result.messageId };
}
