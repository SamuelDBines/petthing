import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Settings } from "@/lib/domain";
import type { StoreConfig } from "@/lib/tenant/types";
import type { StoreRow } from "@/lib/tenant/types";
import { bustStoreDomainCache } from "@/lib/tenant/domainCache";
import { configFromRow } from "@/lib/tenant/resolve";
import { BUILTIN_STORES, DEFAULT_STORE_ID } from "@/lib/tenant/defaults";
import { getSql } from "@/lib/db/client";
import { drizzle } from "drizzle-orm/postgres-js";

const { stores, appSettings } = schema;

function tdb() {
  return drizzle(getSql(), { schema });
}

function toSettings(row: typeof appSettings.$inferSelect): Settings {
  return {
    themeMode: row.themeMode,
    activeThemeId: row.activeThemeId,
    salesPaused: row.salesPaused,
    queueHalted: row.queueHalted,
    haltReason: row.haltReason,
    haltNotifiedOn: row.haltNotifiedOn,
  };
}

export async function ensureBuiltinStores() {
  for (const builtin of BUILTIN_STORES) {
    await tdb()
      .insert(stores)
      .values({
        id: builtin.id,
        slug: builtin.slug,
        domains: builtin.domains,
        config: {},
      })
      .onConflictDoNothing();
    await tdb()
      .insert(appSettings)
      .values({
        storeId: builtin.id,
        themeMode: builtin.settings.themeMode,
        activeThemeId: builtin.settings.activeThemeId,
        salesPaused: builtin.settings.salesPaused,
        queueHalted: builtin.settings.queueHalted,
      })
      .onConflictDoNothing();
  }
}

export async function listStoreRows(): Promise<StoreRow[]> {
  await ensureBuiltinStores();
  const rows = await tdb().select().from(stores).orderBy(stores.id);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    domains: row.domains ?? [],
    config: configFromRow(row.id, row.config as Partial<StoreConfig>, row.domains ?? []),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getStoreRow(id: string): Promise<StoreRow | null> {
  const [row] = await tdb().select().from(stores).where(eq(stores.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    domains: row.domains ?? [],
    config: configFromRow(row.id, row.config as Partial<StoreConfig>, row.domains ?? []),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertStoreRow(input: {
  id: string;
  slug: string;
  domains: string[];
  config?: Partial<StoreConfig>;
}) {
  const base = configFromRow(input.id, null);
  await tdb()
    .insert(stores)
    .values({
      id: input.id,
      slug: input.slug,
      domains: input.domains,
      config: input.config ?? {},
    })
    .onConflictDoUpdate({
      target: stores.id,
      set: { slug: input.slug, domains: input.domains, config: input.config ?? {} },
    });
  bustStoreDomainCache();
  await tdb()
    .insert(appSettings)
    .values({
      storeId: input.id,
      themeMode: base.settings.themeMode,
      activeThemeId: base.settings.activeThemeId,
    })
    .onConflictDoNothing();
  return getStoreRow(input.id);
}

export async function getStoreSettings(storeId = DEFAULT_STORE_ID) {
  const [row] = await tdb().select().from(appSettings).where(eq(appSettings.storeId, storeId)).limit(1);
  if (!row) {
    const builtin = BUILTIN_STORES.find((s) => s.id === storeId);
    return builtin?.settings ?? BUILTIN_STORES[0].settings;
  }
  return toSettings(row);
}

export async function updateStoreSettings(storeId: string, patch: Partial<Settings>) {
  const set: Partial<typeof appSettings.$inferInsert> = {};
  if (patch.themeMode !== undefined) set.themeMode = patch.themeMode;
  if (patch.activeThemeId !== undefined) set.activeThemeId = patch.activeThemeId;
  if (patch.salesPaused !== undefined) set.salesPaused = patch.salesPaused;
  if (patch.queueHalted !== undefined) set.queueHalted = patch.queueHalted;
  if (patch.haltReason !== undefined) set.haltReason = patch.haltReason;
  if (patch.haltNotifiedOn !== undefined) set.haltNotifiedOn = patch.haltNotifiedOn;
  const [row] = await tdb().update(appSettings).set(set).where(eq(appSettings.storeId, storeId)).returning();
  if (!row) throw new Error("Settings not found");
  return toSettings(row);
}
