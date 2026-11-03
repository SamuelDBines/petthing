const DEFAULT = "samuelbines@gmail.com";

export function allowedAdminEmails() {
  const raw = process.env.ADMIN_ALLOWED_EMAILS?.trim() || DEFAULT;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return allowedAdminEmails().includes(email.trim().toLowerCase());
}
