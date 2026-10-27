import { assertCron } from "@/lib/runtime";
import { autoSubmitAllCatalogueStores } from "@/lib/shop/go-dropship-automation";

export async function GET(request: Request) {
  try {
    assertCron(request);
  } catch {
    return new Response("Unauthorised", { status: 401 });
  }
  const submitted = await autoSubmitAllCatalogueStores();
  return Response.json({ ok: true, submitted });
}

export const POST = GET;
