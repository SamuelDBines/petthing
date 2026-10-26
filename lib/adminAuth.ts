import { cookies } from "next/headers";
import { safeEqual, secret, signValue } from "@/lib/runtime";

const COOKIE = "ps_admin";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function sessionSecret() {
  return secret("ADMIN_SESSION_SECRET", secret("ADMIN_PASSWORD", "dev-admin-session"));
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = signValue(exp, "ADMIN_SESSION_SECRET", sessionSecret());
  return safeEqual(sig, expected);
}

export async function startAdminSession() {
  const exp = String(Date.now() + WEEK);
  const sig = signValue(exp, "ADMIN_SESSION_SECRET", sessionSecret());
  const jar = await cookies();
  jar.set(COOKIE, `${exp}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK / 1000,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
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
