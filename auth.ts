import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";
import { recordAdminLogin } from "@/lib/admin/audit";
import { canonicalAdminOrigin } from "@/lib/admin/canonical";
import { clientIp } from "@/lib/runtime";

function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET,
  basePath: "/api/auth",
  providers: googleEnabled()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  pages: {
    signIn: "/admin",
    error: "/admin/forbidden",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const email = profile?.email?.toLowerCase();
      const verified = profile?.email_verified === true;
      if (!email || !verified) return false;
      if (!isAllowedAdminEmail(email)) return false;
      return true;
    },
    async session({ session }) {
      if (session.user?.email && !isAllowedAdminEmail(session.user.email)) {
        return { ...session, user: { ...session.user, email: undefined } };
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email || !isAllowedAdminEmail(email)) return;
      try {
        const { headers } = await import("next/headers");
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || clientIp({ headers: h } as Request);
        await recordAdminLogin(email, ip);
      } catch {
        await recordAdminLogin(email, "unknown");
      }
    },
  },
});

export function adminOAuthConfigured() {
  return googleEnabled() && Boolean(process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET);
}

/** Redirect URI to register in Google Cloud (single canonical admin host). */
export function googleOAuthRedirectUri() {
  return `${canonicalAdminOrigin()}/api/auth/callback/google`;
}
