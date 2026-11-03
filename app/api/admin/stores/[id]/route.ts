import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";
import { loadStoreConfig } from "@/lib/tenant/context";

const schema = z.object({
  domains: z.array(z.string().min(3)).optional(),
  tagline: z.string().max(500).optional(),
  supportEmail: z.string().email().optional(),
  salesPaused: z.boolean().optional(),
  queueHalted: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const store = getStore();
  if (!store.upsertStore) return jsonError("Store edits are not available.", 501);
  const existing = await loadStoreConfig(id);
  const domains = parsed.data.domains ?? existing.domains;
  const configPatch: Record<string, unknown> = {};
  if (parsed.data.tagline !== undefined || parsed.data.supportEmail !== undefined) {
    configPatch.brand = {
      ...(parsed.data.tagline !== undefined ? { tagline: parsed.data.tagline } : {}),
      ...(parsed.data.supportEmail !== undefined ? { supportEmail: parsed.data.supportEmail } : {}),
    };
  }
  await store.upsertStore({ id, slug: id, domains, config: configPatch });
  if (parsed.data.salesPaused !== undefined || parsed.data.queueHalted !== undefined) {
    const current = await store.getSettings(id);
    await store.updateSettings(
      {
        ...current,
        salesPaused: parsed.data.salesPaused ?? current.salesPaused,
        queueHalted: parsed.data.queueHalted ?? current.queueHalted,
        haltReason: parsed.data.queueHalted ? current.haltReason ?? "Paused from admin." : null,
      },
      id,
    );
  }
  const config = await loadStoreConfig(id);
  return Response.json({ store: { id, domains: config.domains, brand: config.brand, settings: config.settings } });
}
