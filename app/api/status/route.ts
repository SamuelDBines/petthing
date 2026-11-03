import { NextRequest } from "next/server";
import { buildCheckoutSuccessStatus } from "@/lib/checkout/build-success-status";
import { jsonError } from "@/lib/http";
import { requestStoreId } from "@/lib/tenant/context";

function mediaOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host.split(",")[0]?.trim()}`;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return jsonError("Missing session.");
  const storeId = await requestStoreId();
  const payload = await buildCheckoutSuccessStatus({
    sessionId,
    storeId,
    mediaOrigin: mediaOrigin(request),
  });
  return Response.json({
    ...payload,
    status: legacyStatus(payload.phase),
    resultsPath: payload.resultsPath,
  });
}

function legacyStatus(phase: string) {
  if (phase === "ready") return "delivered";
  if (phase === "generating") return "generating";
  if (phase === "review") return "review";
  if (phase === "refunded") return "refunded";
  if (phase === "failed") return "failed";
  if (phase === "confirming") return "confirming";
  if (phase === "expired_unpaid") return "expired";
  if (phase === "christmas_booked") return "paid";
  if (phase === "print_processing") return "submitted";
  return phase;
}
