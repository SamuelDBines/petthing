/** Shared cookie options for admin session (cross-subdomain on staging when set). */
export function adminCookieOptions(maxAgeSeconds: number) {
  const domain = process.env.ADMIN_COOKIE_DOMAIN?.trim();
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    ...(domain ? { domain } : {}),
  };
}
