import { THEMES, getTheme, type ThemeDefinition } from "@/config/themes";
import { londonDay } from "@/lib/runtime";
import { getStore } from "@/lib/store";
import type { Settings } from "@/lib/domain";

export function resolveTheme(settings: Settings, today = londonDay()): ThemeDefinition {
  if (settings.themeMode === "manual") {
    return getTheme(settings.activeThemeId) ?? THEMES[0];
  }
  return THEMES.find((theme) => theme.startsOn <= today && today <= theme.endsOn) ?? THEMES[0];
}

export async function getCatalog() {
  const settings = await getStore().getSettings();
  const theme = resolveTheme(settings);
  return { settings, theme };
}
