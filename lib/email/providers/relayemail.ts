import type { EmailMessage } from "@/lib/email/types";
import { parseFromHeader } from "@/lib/email/from-header";

export type RelayEmailSendResult = {
  id: string;
  sesMessageId?: string;
  status: string;
};

export type RelayEmailSendBody = {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type FetchFn = typeof fetch;

let fetchImpl: FetchFn = fetch;

export function __setRelayEmailFetchForTests(fn: FetchFn | null) {
  fetchImpl = fn ?? fetch;
}

export function relayEmailApiBase() {
  return (process.env.RELAYEMAIL_API_BASE || "https://relayemail.net").replace(/\/$/, "");
}

export async function sendViaRelayEmail(
  message: EmailMessage,
  from: string,
  replyTo?: string,
): Promise<RelayEmailSendResult> {
  const key = process.env.RELAYEMAIL_API_KEY?.trim();
  if (!key) throw new Error("RELAYEMAIL_API_KEY is not set");

  const parsed = parseFromHeader(from);
  const text = message.text?.trim() || stripHtmlToText(message.html);
  const body: RelayEmailSendBody = {
    from: parsed.email,
    fromName: parsed.name,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text,
  };
  if (replyTo) body.replyTo = replyTo;

  let payload: RelayEmailSendBody = body;
  let res = await postSend(key, payload);
  if (!res.ok && replyTo && shouldRetryWithoutReplyTo(res)) {
    console.warn("[email] Relay Email rejected replyTo — retrying without replyTo");
    const { replyTo: _drop, ...rest } = body;
    payload = rest as RelayEmailSendBody;
    res = await postSend(key, payload);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Relay Email send failed (${res.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    id?: string;
    sesMessageId?: string;
    status?: string;
  };
  if (!data.id) throw new Error("Relay Email response missing id");
  return {
    id: data.id,
    sesMessageId: data.sesMessageId,
    status: data.status ?? "sent",
  };
}

async function postSend(key: string, body: RelayEmailSendBody) {
  return fetchImpl(`${relayEmailApiBase()}/api/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function shouldRetryWithoutReplyTo(res: Response) {
  return res.status === 400 || res.status === 422;
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
