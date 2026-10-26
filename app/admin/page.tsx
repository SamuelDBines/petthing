import { AdminDashboard } from "@/components/admin-dashboard";
import { adminOAuthConfigured } from "@/auth";
import { isAdmin, passwordLoginEnabled } from "@/lib/adminAuth";

export default async function Page() {
  const authed = await isAdmin();
  return (
    <AdminDashboard
      initialAuthed={authed}
      oauthEnabled={adminOAuthConfigured()}
      passwordLogin={passwordLoginEnabled()}
    />
  );
}
