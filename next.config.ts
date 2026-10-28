import type { NextConfig } from "next";
import { nextHeaderRules } from "@/lib/next-security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["sharp", "pngjs", "postgres"],
  async headers() {
    return nextHeaderRules();
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
