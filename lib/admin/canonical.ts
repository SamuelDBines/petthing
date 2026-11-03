function normalizeHost(host: string) {
  return host.trim().toLowerCase().split(":")[0];
}

/** Canonical admin origin (no trailing slash). */
export function canonicalAdminOrigin() {
  const raw =
    process.env.ADMIN_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function canonicalAdminHost() {
  try {
    return normalizeHost(new URL(canonicalAdminOrigin()).host);
  } catch {
    return "localhost";
  }
}

export function requestAdminHost(headers: Headers) {
  const raw = headers.get("x-forwarded-host") || headers.get("host") || "localhost";
  return normalizeHost(raw.split(",")[0]?.trim() ?? "localhost");
}

export function isCanonicalAdminHost(headers: Headers) {
  const requestHost = requestAdminHost(headers);
  const canonical = canonicalAdminHost();
  if (requestHost === canonical) return true;
  // Local dev: treat any *.localhost as canonical when admin URL is localhost.
  if (canonical === "localhost" && (requestHost === "localhost" || requestHost.endsWith(".localhost"))) {
    return true;
  }
  return false;
}

export function canonicalAdminPath(pathname: string, search = "") {
  return `${canonicalAdminOrigin()}${pathname}${search}`;
}
