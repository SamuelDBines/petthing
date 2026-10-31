import { cookies } from "next/headers";
import { auth, adminOAuthConfigured } from "@/auth";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";
import { adminCookieOptions } from "@/lib/admin/cookies";
import { safeEqual, secret, signValue } from "@/lib/runtime";

const LEGACY_COOKIE = "ps_admin";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function sessionSecret() {
  return secret("ADMIN_SESSION_SECRET", secret("ADMIN_PASSWORD", "dev-admin-session"));
}

export function passwordLoginEnabled() {
  return process.env.ADMIN_PASSWORD_LOGIN === "true" && Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export function adminConfigured() {
  return adminOAuthConfigured() || passwordLoginEnabled();
}

async function legacyCookieAdmin() {
  if (!passwordLoginEnabled()) return false;
  const jar = await cookies();
  const token = jar.get(LEGACY_COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = signValue(exp, "ADMIN_SESSION_SECRET", sessionSecret());
  return safeEqual(sig, expected);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  if (await legacyCookieAdmin()) return true;
  const session = await auth();
  const email = session?.user?.email;
  return Boolean(email && isAllowedAdminEmail(email));
}

export async function adminSessionEmail() {
  if (await legacyCookieAdmin()) return "password-login";
  const session = await auth();
  return session?.user?.email ?? null;
}

export async function startAdminSession() {
  const exp = String(Date.now() + WEEK);
  const sig = signValue(exp, "ADMIN_SESSION_SECRET", sessionSecret());
  const jar = await cookies();
  jar.set(LEGACY_COOKIE, `${exp}.${sig}`, adminCookieOptions(WEEK / 1000));
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.set(LEGACY_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
}

export function passwordMatches(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function requireAdmin() {
  if (await isAdmin()) return null;
  return Response.json({ error: "Sign in required" }, { status: 401 });
}

export async function requireAdminPost(request: Request) {
  const { assertAdminPostOrigin } = await import("@/lib/admin/csrf");
  const originDenied = assertAdminPostOrigin(request);
  if (originDenied) return originDenied;
  return requireAdmin();
}
