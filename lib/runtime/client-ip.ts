function parseCidr(cidr: string) {
  const [ip, bitsRaw] = cidr.trim().split("/");
  const bits = bitsRaw ? Number(bitsRaw) : 32;
  if (!ip || !Number.isFinite(bits)) return null;
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) return null;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const value = ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
  return { mask, value };
}

function ipv4ToInt(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isTrustedProxy(ip: string, trusted: ReturnType<typeof parseCidr>[]) {
  const value = ipv4ToInt(ip);
  if (value == null) return false;
  return trusted.some((cidr) => cidr && (value & cidr.mask) === (cidr.value & cidr.mask));
}

export function trustedProxyCidrs() {
  const raw = process.env.TRUSTED_PROXY_CIDRS || "10.0.0.0/8";
  return raw
    .split(",")
    .map((part) => parseCidr(part))
    .filter(Boolean) as NonNullable<ReturnType<typeof parseCidr>>[];
}

export function resolveClientIpFromHeaders(headers: Headers) {
  const trusted = trustedProxyCidrs();
  const chain = (headers.get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) chain.push(realIp);
  for (const ip of chain) {
    if (!isTrustedProxy(ip, trusted)) return ip;
  }
  return chain[0] || realIp || "local";
}
