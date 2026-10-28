import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import type { EmailMessage } from "@/lib/email/types";
import { awsSesRegion, replyToAddress, sesConfigurationSet } from "@/lib/email/config";

export type SesClientBundle = {
  sesv2: SESv2Client;
  ses: SESClient;
};

let clientFactory: (() => SesClientBundle) | null = null;

function defaultClients(): SesClientBundle {
  const region = awsSesRegion();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const credentials =
    accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
  return {
    sesv2: new SESv2Client({ region, credentials }),
    ses: new SESClient({ region, credentials }),
  };
}

export function sesClients() {
  return (clientFactory ?? defaultClients)();
}

export function __setSesClientsForTests(factory: (() => SesClientBundle) | null) {
  clientFactory = factory;
}

export async function sendViaSes(message: EmailMessage, from: string, replyToOverride?: string) {
  const { sesv2, ses } = sesClients();
  const replyTo = replyToOverride || message.replyTo || replyToAddress();
  const configurationSet = sesConfigurationSet();

  if (!message.attachments?.length) {
    const result = await sesv2.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [message.to] },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        ConfigurationSetName: configurationSet,
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: message.html, Charset: "UTF-8" },
              ...(message.text
                ? { Text: { Data: message.text, Charset: "UTF-8" } }
                : {}),
            },
          },
        },
      }),
    );
    return { messageId: result.MessageId };
  }

  const transporter = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    replyTo,
    attachments: message.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
  const raw = info.message;
  if (!Buffer.isBuffer(raw)) throw new Error("SES raw message buffer missing");
  const result = await ses.send(
    new SendRawEmailCommand({
      Source: from,
      Destinations: [message.to],
      RawMessage: { Data: raw },
      ConfigurationSetName: configurationSet,
    }),
  );
  return { messageId: result.MessageId };
}
