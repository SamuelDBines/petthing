import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { localDataPath } from "@/lib/localPaths";
import {
  emailProviderId,
  isEmailStagingGateActive,
  resolveFromAddress,
  stagingAllowsRecipient,
} from "@/lib/email/config";
import { sendViaResend } from "@/lib/email/providers/resend";
import { sendViaSes } from "@/lib/email/providers/ses";
import { isEmailSuppressed } from "@/lib/email/suppressions";
import type { EmailMessage, EmailSendResult } from "@/lib/email/types";

export type { EmailMessage, EmailSendResult } from "@/lib/email/types";

async function writeOutbox(message: EmailMessage) {
  const dir = localDataPath("outbox");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${message.to.replace(/[^a-z0-9@._-]/gi, "_")}.html`;
  await writeFile(path.join(dir, filename), `<!-- ${message.subject} -->\n${message.html}`);
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

  const from = await resolveFromAddress(message.storeId);
  if (!from) throw new Error("EMAIL_FROM is required when a mail provider is configured");

  if (provider === "ses") {
    const result = await sendViaSes(message, from);
    return { sent: true, provider: "ses", messageId: result.messageId };
  }

  const result = await sendViaResend(message, from);
  return { sent: true, provider: "resend", messageId: result.messageId };
}
