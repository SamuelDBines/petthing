import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalAdminOrigin, isCanonicalAdminHost } from "@/lib/admin/canonical";
import { resolveStoreIdFromHost } from "@/lib/tenant/resolve";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const authPath = pathname.startsWith("/api/auth");
  if (adminPath || authPath) {
    const headers = new Headers(request.headers);
    if (!isCanonicalAdminHost(headers)) {
      const base = canonicalAdminOrigin();
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Admin and sign-in are only available on the canonical admin host.", adminUrl: `${base}/admin` },
          { status: 403 },
        );
      }
      return NextResponse.redirect(`${base}${pathname}${search}`);
    }
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const storeQuery = request.nextUrl.searchParams.get("store");
  const cookieStore = request.cookies.get("ps_store")?.value;
  // Edge-safe: builtins + STORE_EXTRA_DOMAINS env only (no Postgres in middleware).
  let storeId = resolveStoreIdFromHost(host, storeQuery);
  if (!storeQuery && cookieStore && process.env.NODE_ENV !== "production") {
    const fromCookie = resolveStoreIdFromHost(host, cookieStore);
    if (fromCookie) storeId = fromCookie;
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-store-id", storeId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("ps_store", storeId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  if (process.env.NODE_ENV !== "production" && storeQuery) {
    response.cookies.set("ps_dev_store", storeQuery, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
