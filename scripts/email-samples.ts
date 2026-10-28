#!/usr/bin/env tsx
/**
 * Send [Sample] branded emails through the normal send path (staging gate applies).
 * Usage: tsx scripts/email-samples.ts --to samuelbines@gmail.com
 */
import { brandedEmailMatrix } from "../lib/email/templates/constants";
import { samplePayload } from "../lib/email/templates/sample-data";
import { renderBrandedEmail } from "../lib/email/templates/render";
import { sendEmail } from "../lib/email/send";

const ALLOWED = "samuelbines@gmail.com";

function parseArgs() {
  const idx = process.argv.indexOf("--to");
  const to = idx >= 0 ? process.argv[idx + 1]?.trim().toLowerCase() : "";
  return { to };
}

async function main() {
  const { to } = parseArgs();
  if (!to || to !== ALLOWED) {
    console.error(`Refusing to send samples to "${to || "(missing)"}". Only ${ALLOWED} is allowed.`);
    process.exit(1);
  }

  for (const { storeId, kind } of brandedEmailMatrix()) {
    const payload = samplePayload(storeId, kind);
    const rendered = await renderBrandedEmail(storeId, kind, payload);
    const result = await sendEmail({
      to,
      subject: `[Sample] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      storeId,
      fromRole: rendered.fromRole,
      listUnsubscribe: rendered.listUnsubscribe,
    });
    if (result.sent) {
      console.log(
        `${storeId}/${kind}: sent provider=${result.provider} id=${result.relayId ?? result.messageId ?? "—"} status=${result.status ?? "ok"}`,
      );
    } else {
      console.log(`${storeId}/${kind}: not sent (gate, suppression, or no provider)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
