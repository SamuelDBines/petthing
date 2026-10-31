import { cookies } from "next/headers";

export type AdminStoreFilter = string | "all";

export async function adminStoreFilter(): Promise<AdminStoreFilter> {
  const jar = await cookies();
  const value = jar.get("ps_admin_store")?.value;
  if (!value || value === "all") return "all";
  return value;
}
