import { z } from "zod";
import { THEMES } from "@/config/themes";
import { requireAdmin } from "@/lib/adminAuth";
import { jsonError, parseBody } from "@/lib/http";
import { getStore } from "@/lib/store";

const schema = z.object({
  themeMode: z.enum(["auto", "manual"]),
  activeThemeId: z.string(),
  salesPaused: z.boolean(),
  queueHalted: z.boolean(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = parseBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (!THEMES.some((theme) => theme.id === parsed.data.activeThemeId)) return jsonError("Unknown theme.");
  const settings = await getStore().updateSettings({
    ...parsed.data,
    haltReason: parsed.data.queueHalted ? "Paused from admin." : null,
  });
  return Response.json({ settings });
}
