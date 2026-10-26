import { shareForToken } from "@/lib/gallery";
import { jsonError } from "@/lib/http";

function originOf(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const share = await shareForToken(token, originOf(request));
  if (!share) return jsonError("This preview is not available.", 404);
  return Response.json(share);
}
