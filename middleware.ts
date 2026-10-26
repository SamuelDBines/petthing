import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cachedStoreDomainRows } from "@/lib/tenant/domainCache";
import { resolveStoreIdFromHost } from "@/lib/tenant/resolve";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const storeQuery = request.nextUrl.searchParams.get("store");
  const cookieStore = request.cookies.get("ps_store")?.value;
  const dbRows = await cachedStoreDomainRows();
  let storeId = resolveStoreIdFromHost(host, storeQuery, dbRows);
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
