import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { APP_NAME } from "@/config/brand";

type Message = { to: string; subject: string; html: string };

export async function sendEmail(message: Message) {
  const dir = path.join(process.cwd(), ".data", "outbox");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${message.to.replace(/[^a-z0-9@._-]/gi, "_")}.html`;
  await writeFile(path.join(dir, filename), `<!-- ${message.subject} -->\n${message.html}`);
  console.log(`[email] ${message.to} — ${message.subject}`);

  if (!process.env.RESEND_API_KEY) return { sent: false as const };
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is required when RESEND_API_KEY is set");
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  if (error) throw new Error(error.message);
  return { sent: true as const };
}

export async function alertAdmin(subject: string, html: string) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.log(`[admin alert] ${subject}`);
    return;
  }
  await sendEmail({ to, subject: `${APP_NAME}: ${subject}`, html });
}

export function resultsEmail(resultsUrl: string) {
  return `
    <p>Your portraits are ready.</p>
    <p><a href="${resultsUrl}">Open your private gallery</a>. The link is unguessable — don’t post it if you want the full-resolution files kept private. Share buttons on the page use a watermarked preview.</p>
    <p>Uploaded photos are deleted 7 days after delivery. Finished portraits are deleted after 30 days. Download anything you want to keep.</p>
    <p>Not quite right? Reply and we’ll regenerate free of charge. If you’re still unhappy, we’ll refund you.</p>
  `;
}

export function reviewReadyEmail(adminUrl: string, email: string) {
  return `<p>An order for ${email} is waiting for review.</p><p><a href="${adminUrl}">Open the admin queue</a></p>`;
}

export function christmasEmail() {
  return `<p>Your Christmas pre-order is paid. We’ll start the Christmas set on 1 November and email you when it’s time to confirm photos and styles.</p>`;
}
