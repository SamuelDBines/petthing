import { sendAbandonedCheckoutReminders } from "@/lib/shop/abandoned-checkout";
import { assertCron } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    assertCron(request);
  } catch {
    return new Response("Unauthorised", { status: 401 });
  }
  const sent = await sendAbandonedCheckoutReminders();
  return Response.json({ ok: true, sent });
}

export const POST = GET;
