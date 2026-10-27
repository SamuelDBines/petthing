export type EmailAttachment = { filename: string; content: Buffer };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  /** Per-store From header (name + address). */
  storeId?: string;
  replyTo?: string;
};

export type EmailSendResult = { sent: false } | { sent: true; provider: string; messageId?: string };
