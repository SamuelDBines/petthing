import { z } from "zod";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { requireAdmin, requireAdminPost } from "@/lib/adminAuth";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { loadStoreConfig } from "@/lib/tenant/context";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";

const schema = z.object({
  themeMode: z.enum(["auto", "manual"]),
  activeThemeId: z.string(),
  salesPaused: z.boolean(),
  queueHalted: z.boolean(),
});

export async function POST(request: Request) {
  const denied = await requireAdminPost(request);
  if (denied) return denied;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const storeId = await adminStoreFilter();
  const scoped = storeId === "all" ? DEFAULT_STORE_ID : storeId;
  const config = await loadStoreConfig(scoped);
  if (!config.themes.some((theme) => theme.id === parsed.data.activeThemeId)) return jsonError("Unknown theme.");
  const settings = await getStore().updateSettings(
    {
      ...parsed.data,
      haltReason: parsed.data.queueHalted ? "Paused from admin." : null,
    },
    scoped,
  );
  return Response.json({ settings });
}
