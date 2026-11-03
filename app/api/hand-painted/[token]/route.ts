import { getStore } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const store = getStore();
  const row = await store.getHandPaintedByProofToken(token);
  if (!row) return jsonError("Not found", 404);
  return Response.json({
    orderId: row.orderId,
    status: row.status,
    proofAssetUrl: row.proofAssetUrl,
    sizeLabel: row.sizeLabel,
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const store = getStore();
  const row = await store.getHandPaintedByProofToken(token);
  if (!row) return jsonError("Not found", 404);
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "approve") return jsonError("Unknown action");
  if (!row.proofAssetUrl) return jsonError("No proof uploaded yet.");
  const next = {
    ...row,
    status: "proof_approved" as const,
    updatedAt: new Date().toISOString(),
  };
  await store.upsertHandPaintedOrder(next);
  return Response.json({ ok: true, status: next.status });
}
