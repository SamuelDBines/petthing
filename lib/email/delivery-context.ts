import type { EmailMessage } from "@/lib/email/types";

export type EmailDeliveryFields = {
  stripeLivemode: boolean | null;
  requestHost?: string | null;
};

export function orderEmailDelivery(order: { stripeLivemode?: boolean | null }): EmailDeliveryFields {
  return { stripeLivemode: order.stripeLivemode ?? false };
}

export function withEmailDelivery(
  delivery: EmailDeliveryFields,
  message: Omit<EmailMessage, "stripeLivemode" | "requestHost">,
): EmailMessage {
  return { ...message, ...delivery };
}

const INTERNAL_INBOX_ENVS = ["ADMIN_EMAIL", "GODROPSHIP_ORDERS_EMAIL", "ARTINBULK_ORDERS_EMAIL"] as const;

export function isInternalEmailInbox(to: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const norm = to.trim().toLowerCase();
  for (const key of INTERNAL_INBOX_ENVS) {
    const v = env[key]?.trim().toLowerCase();
    if (v && norm === v) return true;
  }
  return false;
}

/** Throws when a customer-facing send is missing livemode/host context. */
export function assertCustomerEmailDelivery(message: EmailMessage) {
  if (isInternalEmailInbox(message.to)) return;
  if (!message.storeId) {
    throw new Error(`Customer email "${message.subject}" requires storeId`);
  }
  const hasHost = Boolean(message.requestHost?.trim());
  const hasMode = message.stripeLivemode !== undefined && message.stripeLivemode !== null;
  if (!hasHost && !hasMode) {
    throw new Error(
      `Customer email "${message.subject}" requires stripeLivemode and/or requestHost for staging gate`,
    );
  }
}
