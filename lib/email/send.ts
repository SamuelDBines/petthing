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

async function writeOutbox(message: EmailMessage, meta: Record<string, string>) {
  const dir = localDataPath("outbox");
  await mkdir(dir, { recursive: true });
  const slug = message.to.replace(/[^a-z0-9@._-]/gi, "_");
  const stamp = Date.now();
  const base = `${stamp}-${slug}`;
  await writeFile(path.join(dir, `${base}.html`), `<!-- ${message.subject} -->\n${message.html}`);
  await writeFile(path.join(dir, `${base}.meta.json`), JSON.stringify(meta, null, 2));
}

function logEmail(message: EmailMessage, meta: Record<string, string>) {
  const ids = [
    meta.relayId ? `relayId=${meta.relayId}` : "",
    meta.sesMessageId ? `sesMessageId=${meta.sesMessageId}` : "",
    meta.messageId ? `messageId=${meta.messageId}` : "",
    meta.outcome ? `outcome=${meta.outcome}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  console.log(`[email] ${message.to} — ${message.subject}${ids ? ` · ${ids}` : ""}`);
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const meta: Record<string, string> = {
    provider: emailProviderId(),
    outcome: "queued",
  };

  if (await isEmailSuppressed(message.to)) {
    meta.outcome = "suppressed";
    await writeOutbox(message, meta);
    logEmail(message, meta);
    return { sent: false };
  }

  if (isEmailStagingGateActive() && !stagingAllowsRecipient(message.to)) {
    meta.outcome = "staging_gate";
    await writeOutbox(message, meta);
    logEmail(message, meta);
    return { sent: false };
  }

  const provider = emailProviderId();
  if (provider === "none") {
    meta.outcome = "no_provider";
    await writeOutbox(message, meta);
    logEmail(message, meta);
    return { sent: false };
  }

  const fromRole = message.fromRole ?? "orders";
  const from = await resolveFromAddress(message.storeId, fromRole);
  if (!from) throw new Error("EMAIL_FROM is required when a mail provider is configured");

  const replyTo = message.replyTo ?? (await resolveReplyToAddress(message.storeId));

  if (provider === "relayemail") {
    const result = await sendViaRelayEmail(message, from, replyTo);
    meta.outcome = "sent";
    meta.relayId = result.id;
    if (result.sesMessageId) meta.sesMessageId = result.sesMessageId;
    if (result.status) meta.status = result.status;
    await writeOutbox(message, meta);
    logEmail(message, meta);
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
    meta.outcome = "sent";
    if (result.messageId) {
      meta.messageId = result.messageId;
      meta.sesMessageId = result.messageId;
    }
    await writeOutbox(message, meta);
    logEmail(message, meta);
    return { sent: true, provider: "ses", messageId: result.messageId, sesMessageId: result.messageId };
  }

  const result = await sendViaResend(message, from);
  meta.outcome = "sent";
  meta.messageId = result.messageId;
  await writeOutbox(message, meta);
  logEmail(message, meta);
  return { sent: true, provider: "resend", messageId: result.messageId };
}
