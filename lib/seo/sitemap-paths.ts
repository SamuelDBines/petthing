import type { StoreConfig } from "@/lib/tenant/types";

/** Public paths that exist for each store (no dynamic segments). Used for sitemap.xml. */
export const SITEMAP_PATHS_BY_STORE: Record<string, string[]> = {
  pawtraitry: ["/", "/create", "/privacy", "/terms", "/refunds", "/shipping"],
  fixmonger: ["/", "/shop/cart", "/privacy", "/terms", "/refunds", "/shipping"],
  jinglefold: ["/", "/shop/cart", "/privacy", "/terms", "/refunds", "/shipping"],
};

export function sitemapPathsForStore(storeId: string, config?: Pick<StoreConfig, "storeType">): string[] {
  const paths = SITEMAP_PATHS_BY_STORE[storeId];
  if (paths) return paths;
  if (config?.storeType === "portrait") return SITEMAP_PATHS_BY_STORE.pawtraitry ?? ["/"];
  return SITEMAP_PATHS_BY_STORE.fixmonger ?? ["/"];
}
