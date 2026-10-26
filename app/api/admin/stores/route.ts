import { z } from "zod";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";
import { adminCookieOptions } from "@/lib/admin/cookies";
import { cookies } from "next/headers";

export async function GET() {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const store = getStore();
  const rows = store.listStores ? await store.listStores() : [];
  const stores = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      settings: await store.getSettings(row.id),
    })),
  );
  const selected = await adminStoreFilter();
  return Response.json({ stores, selected });
}

const createSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,32}$/),
  slug: z.string().regex(/^[a-z0-9-]{2,32}$/),
  domains: z.array(z.string().min(3)).min(1),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const parsed = parseBody(createSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  if (!store.upsertStore) return jsonError("Store management needs Postgres.", 501);
  const row = await store.upsertStore(parsed.data);
  return Response.json({ store: row });
}

const selectSchema = z.object({ storeId: z.union([z.literal("all"), z.string().min(2)]) });

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const parsed = parseBody(selectSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const jar = await cookies();
  jar.set("ps_admin_store", parsed.data.storeId, adminCookieOptions(60 * 60 * 24 * 90));
  return Response.json({ ok: true, storeId: parsed.data.storeId });
}
