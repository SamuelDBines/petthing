import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { storeRequestIndexable } from "@/lib/seo/page-robots";
import { sitemapPathsForStore } from "@/lib/seo/sitemap-paths";
import { loadStoreConfig } from "@/lib/tenant/context";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const config = await loadStoreConfig();
  if (!storeRequestIndexable(config.id, host)) {
    return [];
  }
  const origin = storeCanonicalOrigin(config.id, config.brand, config.domains);
  const now = new Date();
  const paths = sitemapPathsForStore(config.id, config);
  return paths.map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
