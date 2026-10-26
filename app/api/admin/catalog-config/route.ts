import { z } from "zod";
import { DEFAULT_JINGLEFOLD_CUTOFFS } from "@/config/jinglefold";
import { DEFAULT_PAWTRAITRY_PROMOS } from "@/config/pawtraitry-promos";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { requireAdmin } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";
import { loadStoreConfig } from "@/lib/tenant/context";

const schema = z.object({
  jinglefoldCutoffs: z
    .object({
      prodigiBaubleIso: z.string(),
      printfulStockingIso: z.string(),
      goDropshipDecorIso: z.string(),
    })
    .optional(),
  pawtraitryPromos: z
    .object({
      freeBaubleWithCanvasEnabled: z.boolean(),
    })
    .optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const storeId = await adminStoreFilter();
  const scoped = storeId === "all" ? "pawtraitry" : storeId;
  const config = await loadStoreConfig(scoped);
  return Response.json({
    jinglefoldCutoffs: config.catalog.jinglefold?.cutoffs ?? DEFAULT_JINGLEFOLD_CUTOFFS,
    pawtraitryPromos: config.catalog.pawtraitryPromos ?? DEFAULT_PAWTRAITRY_PROMOS,
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  if (!store.upsertStore) return jsonError("Catalog config needs Postgres.", 501);
  const storeId = await adminStoreFilter();
  const target = parsed.data.jinglefoldCutoffs ? "jinglefold" : "pawtraitry";
  if (storeId !== "all" && storeId !== target) {
    return jsonError(`Switch admin store to ${target} to edit these settings.`, 400);
  }
  const existing = await loadStoreConfig(target);
  const patch = {
    catalog: {
      ...existing.catalog,
      ...(parsed.data.jinglefoldCutoffs
        ? { jinglefold: { cutoffs: parsed.data.jinglefoldCutoffs } }
        : {}),
      ...(parsed.data.pawtraitryPromos ? { pawtraitryPromos: parsed.data.pawtraitryPromos } : {}),
    },
  };
  await store.upsertStore({
    id: target,
    slug: target,
    domains: existing.domains,
    config: patch,
  });
  return Response.json({ ok: true });
}
