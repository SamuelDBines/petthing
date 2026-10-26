import Link from "next/link";
import { canonicalAdminOrigin } from "@/lib/admin/canonical";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center" data-testid="admin-forbidden">
      <h1 className="text-3xl">Access denied</h1>
      <p className="mt-4 text-sm text-cream/70">
        This Google account is not on the admin allowlist, or your email is not verified. Ask the site owner to add your
        address to <code className="text-xs">ADMIN_ALLOWED_EMAILS</code>.
      </p>
      <Link href="/admin" className="mt-8 inline-block rounded-full bg-pumpkin px-4 py-2 text-ink">
        Back to sign in
      </Link>
      <p className="mt-6 text-xs text-cream/50">Admin URL: {canonicalAdminOrigin()}/admin</p>
    </main>
  );
}
