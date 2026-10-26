import { PRINTS } from "@/config/prints";
import { CHRISTMAS_PREORDER_PENCE, TIERS } from "@/config/pricing";
import { THEMES } from "@/config/themes";
import { getCatalog } from "@/lib/catalog";
import { demoCheckoutAllowed } from "@/lib/runtime";

export async function GET() {
  const { settings, theme } = await getCatalog();
  return Response.json({
    theme,
    themes: THEMES.map((item) => ({ id: item.id, name: item.name, startsOn: item.startsOn })),
    tiers: TIERS,
    prints: PRINTS,
    christmasPence: CHRISTMAS_PREORDER_PENCE,
    salesPaused: settings.salesPaused,
    themeMode: settings.themeMode,
    demoCheckout: demoCheckoutAllowed(),
  });
}
