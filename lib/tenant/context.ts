import { headers } from "next/headers";
import { DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { configFromRow } from "@/lib/tenant/resolve";
import type { StoreConfig } from "@/lib/tenant/types";
import { getStore } from "@/lib/store";

export async function requestStoreId(): Promise<string> {
  const h = await headers();
  return h.get("x-store-id") || DEFAULT_STORE_ID;
}

export async function loadStoreConfig(storeId?: string): Promise<StoreConfig> {
  const id = storeId ?? (await requestStoreId());
  const data = getStore();
  if (data.getStoreConfig) {
    const row = await data.getStoreConfig(id);
    if (row) return row.config;
  }
  return configFromRow(id, null);
}

export function themeCssVars(colors: StoreConfig["brand"]["colors"]) {
  return {
    "--color-ink": colors.ink,
    "--color-cream": colors.cream,
    "--color-pumpkin": colors.pumpkin,
    "--color-gold": colors.gold,
    "--color-moss": colors.moss,
    "--color-muted": colors.muted,
    "--color-bark": colors.bark,
    "--color-line": colors.line,
  } as Record<string, string>;
}
