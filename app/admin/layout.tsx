import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canonicalAdminPath, isCanonicalAdminHost } from "@/lib/admin/canonical";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!isCanonicalAdminHost(h)) {
    redirect(canonicalAdminPath("/admin"));
  }
  return children;
}
