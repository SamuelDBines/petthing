import type { EmailMessage } from "@/lib/email/types";

export async function sendViaResend(message: EmailMessage, from: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    attachments: message.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
  if (error) throw new Error(error.message);
  return { messageId: data?.id };
}
