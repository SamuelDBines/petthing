import { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return jsonError("Missing session.");
  const store = getStore();
  if (!store.getShopOrderBySession) return jsonError("Not available.", 503);
  const order = await store.getShopOrderBySession(sessionId);
  if (!order) return Response.json({ status: "confirming", amountPence: null });
  return Response.json({ status: order.status, amountPence: order.amountPence });
}
