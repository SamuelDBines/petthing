import { suppressEmail } from "@/lib/email/suppressions";
import { parseVerifiedSnsBody, suppressedAddressesFromSesMessage, type SesBounceNotification } from "@/lib/email/sns";

export async function POST(request: Request) {
  const raw = await request.text();
  let envelope: Record<string, unknown>;
  try {
    envelope = await parseVerifiedSnsBody(raw);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid SNS message" },
      { status: 403 },
    );
  }

  const type = String(envelope.Type || "");
  if (type === "SubscriptionConfirmation") {
    const url = envelope.SubscribeURL;
    if (typeof url === "string") await fetch(url);
    return Response.json({ ok: true, subscribed: true });
  }

  if (type === "Notification" && typeof envelope.Message === "string") {
    const inner = JSON.parse(envelope.Message) as SesBounceNotification;
    const rows = suppressedAddressesFromSesMessage(inner);
    for (const row of rows) {
      await suppressEmail(row.email, row.reason, envelope.Message);
    }
    return Response.json({ ok: true, suppressed: rows.length });
  }

  return Response.json({ ok: true, ignored: type || "unknown" });
}
