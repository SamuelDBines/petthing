import { siteNoindexEnabled } from "@/lib/next-security-headers";

/** Whether HTML metadata should use noindex,nofollow for this request host. */
export function pageRobotsNoindex(host: string) {
  if (siteNoindexEnabled()) return true;
  if (process.env.STAGING_NOINDEX === "1") return true;
  const h = host.toLowerCase();
  return h.includes("bishop-co-tech.co.uk") || h.includes("dropship.store.");
}
