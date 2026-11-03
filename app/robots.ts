import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { storeRequestIndexable } from "@/lib/seo/page-robots";
import { loadStoreConfig } from "@/lib/tenant/context";
import { storeCanonicalOrigin } from "@/lib/tenant/origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const config = await loadStoreConfig();
  if (!storeRequestIndexable(config.id, host)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const origin = storeCanonicalOrigin(config.id, config.brand, config.domains);
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
