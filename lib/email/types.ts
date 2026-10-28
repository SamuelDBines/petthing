export type EmailAttachment = { filename: string; content: Buffer };

export type EmailFromRole = "orders" | "hello";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** Per-store From header (name + address). */
  storeId?: string;
  replyTo?: string;
  /** orders@ for transactional; hello@ for welcome / marketing. */
  fromRole?: EmailFromRole;
  /** List-Unsubscribe URL for marketing mail. */
  listUnsubscribe?: string;
  /** Host header when send is tied to a customer request (email staging gate). */
  requestHost?: string | null;
  /** From Stripe checkout / order — live orders bypass staging gate without host. */
  stripeLivemode?: boolean | null;
};

export type EmailSendResult =
  | { sent: false }
  | {
      sent: true;
      provider: string;
      messageId?: string;
      relayId?: string;
      sesMessageId?: string;
      status?: string;
    };
