import { PRINTS } from "@/config/prints";
import { getCatalog } from "@/lib/catalog";
import { demoCheckoutAllowed } from "@/lib/runtime";
import { requestStoreId } from "@/lib/tenant/context";

export async function GET() {
  const storeId = await requestStoreId();
  const { settings, theme, config } = await getCatalog(storeId);
  return Response.json({
    theme,
    themes: config.themes.map((item) => ({ id: item.id, name: item.name, startsOn: item.startsOn })),
    tiers: config.catalog.tiers,
    prints: storeId === "pawtraitry" ? PRINTS : [],
    painting: config.catalog.painting ?? null,
    christmasPence: config.catalog.christmasPreorderPence,
    salesPaused: settings.salesPaused,
    themeMode: settings.themeMode,
    demoCheckout: demoCheckoutAllowed(),
    storeId: config.id,
    brand: config.brand,
  });
}
