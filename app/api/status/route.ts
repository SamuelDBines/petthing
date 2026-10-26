import { NextRequest } from "next/server";
import { PRINTS } from "@/config/prints";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return jsonError("Missing session.");
  const store = getStore();
  const order = await store.getOrderByCheckoutSession(sessionId);
  if (order) {
    return Response.json({
      kind: "portrait",
      status: order.status,
      amountPence: order.amountPence,
      resultsPath: order.status === "delivered" ? `/results/${order.resultsToken}` : null,
    });
  }
  const print = await store.getPrintBySession(sessionId);
  if (print) {
    const parent = await store.getOrder(print.orderId);
    return Response.json({
      kind: "print",
      status: print.status,
      amountPence: PRINTS.find((item) => item.id === print.productId)?.pricePence ?? null,
      resultsPath: parent ? `/results/${parent.resultsToken}` : null,
    });
  }
  const preorder = await store.getPreorderBySession(sessionId);
  if (preorder) {
    return Response.json({
      kind: "christmas",
      status: preorder.status,
      amountPence: preorder.amountPence,
      resultsPath: null,
    });
  }
  return Response.json({ kind: "unknown", status: "confirming", amountPence: null, resultsPath: null });
}
