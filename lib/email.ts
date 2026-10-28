import { APP_NAME, AI_GENERATED_LABEL, DIGITAL_SUPPLY_CONSENT_LABEL, siteUrl } from "@/config/brand";
import { sendEmail as deliverEmail } from "@/lib/email/send";
import type { EmailMessage } from "@/lib/email/types";

export type { EmailMessage } from "@/lib/email/types";

export async function sendEmail(message: EmailMessage) {
  return deliverEmail(message);
}

export async function alertAdmin(subject: string, html: string, storeId?: string) {
  const to = process.env.ADMIN_EMAIL;
  let prefix = APP_NAME;
  if (storeId) {
    const { loadStoreConfig } = await import("@/lib/tenant/context");
    const config = await loadStoreConfig(storeId);
    prefix = config.brand.appName;
  }
  if (!to) {
    console.log(`[admin alert] ${prefix}: ${subject}`);
    return;
  }
  await sendEmail({ to, subject: `${prefix}: ${subject}`, html, storeId });
}

export function resultsEmail(resultsUrl: string) {
  return `
    <p>Your ${APP_NAME} portraits are ready.</p>
    <p><a href="${resultsUrl}">Open your private gallery</a>. The link is unguessable. don’t post it if you want the full-resolution files kept private. Share buttons on the page use a watermarked preview.</p>
    <p><strong>${AI_GENERATED_LABEL}</strong></p>
    <p>When you checked out you agreed to immediate supply of these digital portraits and acknowledged that you lose your 14-day right to cancel once delivery begins. That matches what you confirmed on the order form: “${DIGITAL_SUPPLY_CONSENT_LABEL}”</p>
    <p>Uploaded photos are deleted 7 days after delivery. Finished portraits are deleted after 30 days. Download anything you want to keep.</p>
    <p>Not quite right? Reply and we’ll regenerate free of charge. If you’re still unhappy, we’ll refund you in line with our <a href="${siteUrl()}/refunds">returns policy</a>.</p>
  `;
}

export function reviewReadyEmail(adminUrl: string, email: string) {
  return `<p>An order for ${email} is waiting for review.</p><p><a href="${adminUrl}">Open the admin queue</a></p>`;
}

export function christmasEmail() {
  return `<p>Your Christmas pre-order is paid. We’ll start the Christmas set on 1 November and email you when it’s time to confirm photos and styles.</p>`;
}
