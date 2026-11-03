import type { ThemeDefinition } from "@/config/themes";
import type { Settings } from "@/lib/domain";
import { londonDay } from "@/lib/runtime";
import { loadStoreConfig } from "@/lib/tenant/context";
import type { StoreConfig } from "@/lib/tenant/types";
import { getStore } from "@/lib/store";

export function resolveThemeForStore(config: StoreConfig, settings: Settings, today = londonDay()): ThemeDefinition {
  if (settings.themeMode === "manual") {
    return config.themes.find((theme) => theme.id === settings.activeThemeId) ?? config.themes[0];
  }
  return config.themes.find((theme) => theme.startsOn <= today && today <= theme.endsOn) ?? config.themes[0];
}

export async function getCatalog(storeId?: string) {
  const config = await loadStoreConfig(storeId);
  const data = getStore();
  const settings = data.getSettings ? await data.getSettings(config.id) : config.settings;
  const theme = resolveThemeForStore(config, settings);
  return { settings, theme, config };
}
