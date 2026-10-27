import { redirect } from "next/navigation";
import { AdminHealthPanel } from "@/components/admin-health";
import { isAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-3xl text-cream">Integration health</h1>
      <p className="mt-2 text-muted">Live status of payment, fulfilment, email, and storage. Test mode keys are flagged.</p>
      <AdminHealthPanel />
    </main>
  );
}
