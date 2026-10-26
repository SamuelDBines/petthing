import { NextRequest } from "next/server";
import { readBlob, verifyMedia } from "@/lib/blobs";
import type { Bucket } from "@/lib/domain";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get("bucket");
  const storagePath = request.nextUrl.searchParams.get("path");
  const exp = request.nextUrl.searchParams.get("exp");
  const sig = request.nextUrl.searchParams.get("sig");
  if (!bucket || !storagePath || !exp || !sig) return jsonError("Missing link details.");
  if (bucket !== "uploads" && bucket !== "results") return jsonError("Unknown file.");
  if (!verifyMedia(bucket, storagePath, exp, sig)) return jsonError("This link has expired.", 401);
  const file = await readBlob(bucket as Bucket, storagePath);
  if (!file) return jsonError("File not found.", 404);
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": "private, max-age=120",
  });
  if (request.nextUrl.searchParams.get("download") === "1") {
    headers.set("Content-Disposition", `attachment; filename="${storagePath.split("/").pop()}"`);
  }
  return new Response(new Uint8Array(file.bytes), { headers });
}
