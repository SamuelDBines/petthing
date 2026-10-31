export function requestHostFromHeaders(headers: Headers | { get(name: string): string | null }) {
  return headers.get("x-forwarded-host") || headers.get("host") || "";
}

export function requestHostFromRequest(request: Request) {
  return requestHostFromHeaders(request.headers);
}
