/** Meta _fbc cookie value from fbclid: fb.1.{creationTime}.{fbclid} */
export function fbcFromFbclid(fbclid: string, creationMs = Date.now()) {
  const trimmed = fbclid.trim();
  if (!trimmed) return null;
  return `fb.1.${creationMs}.${trimmed}`;
}

export function readCookie(name: string, cookieHeader?: string | null) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
