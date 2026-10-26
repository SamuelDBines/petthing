import { galleryForToken } from "@/lib/gallery";
import { jsonError } from "@/lib/http";

function originOf(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const gallery = await galleryForToken(token, originOf(request));
  if (!gallery) return jsonError("We couldn't find that gallery.", 404);
  return Response.json(gallery);
}
