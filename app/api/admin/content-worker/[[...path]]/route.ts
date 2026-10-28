import { isAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/http";

function workerBase() {
  const raw = process.env.CONTENT_WORKER_INTERNAL_URL || process.env.CONTENT_WORKER_URL || "http://127.0.0.1:8080";
  return raw.replace(/\/$/, "");
}

async function proxy(request: Request, pathSegments: string[]) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const targetPath = pathSegments.length ? `/${pathSegments.join("/")}` : "/admin";
  const target = `${workerBase()}${targetPath}${url.search}`;
  const headers = new Headers();
  const secret = process.env.CONTENT_WORKER_SECRET;
  if (secret) headers.set("Authorization", `Bearer ${secret}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }
  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}
