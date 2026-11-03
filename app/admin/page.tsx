import { connection } from "next/server";
import { AdminDashboard } from "@/components/admin-dashboard";
import { adminOAuthConfigured } from "@/auth";
import { isAdmin, passwordLoginEnabled } from "@/lib/adminAuth";

export const instant = false;

export default async function Page() {
  await connection();
  const authed = await isAdmin();
  return (
    <AdminDashboard
      initialAuthed={authed}
      oauthEnabled={adminOAuthConfigured()}
      passwordLogin={passwordLoginEnabled()}
    />
  );
}
