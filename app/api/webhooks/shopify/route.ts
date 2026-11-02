import { after } from "next/server";
import { jsonError } from "@/lib/http";
import { alertAdmin } from "@/lib/email";
import { verifyShopifyHmac, type ShopifyOrderPayload } from "@/lib/shopify/orders-paid";
import { handleShopifyOrdersPaid } from "@/lib/shopify/orders-paid-handler";

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return jsonError("Shopify webhooks are not configured.", 503);
  const raw = await request.text();
  if (!verifyShopifyHmac(raw, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return jsonError("Invalid Shopify signature.", 401);
  }
  const expectedShop = process.env.SHOPIFY_SHOP_DOMAIN;
  if (expectedShop && request.headers.get("x-shopify-shop-domain") !== expectedShop) return jsonError("Unknown shop.", 403);
  const topic = request.headers.get("x-shopify-topic");
  if (topic !== "orders/paid") return Response.json({ received: true, ignored: topic });
  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Bad JSON.", 400);
  }
  // Shopify wants a reply within 5s; the photo download and DB writes run after the response.
  // Idempotent on shopify:<order id>:<group>, so Shopify retries are safe.
  after(async () => {
    try {
      await handleShopifyOrdersPaid(payload);
    } catch (error) {
      console.error("[shopify orders/paid]", error);
      const message = error instanceof Error ? error.message : "unknown error";
      await alertAdmin("Shopify order intake failed", `<p>Order ${String(payload.id)}: ${message.replace(/[<>&]/g, "")}</p>`, "pawtraitry").catch(() => {});
    }
  });
  return Response.json({ received: true });
}
