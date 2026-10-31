import { createHmac } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Bucket } from "@/lib/domain";
import { localDataPath } from "@/lib/localPaths";
import { appUrl, safeEqual, secret } from "@/lib/runtime";
import { usingSupabase } from "@/lib/store";

const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;

function localPath(bucket: Bucket, storagePath: string) {
  if (!SAFE_PATH.test(storagePath) || storagePath.includes("..")) {
    throw new Error("Invalid storage path");
  }
  return localDataPath("blobs", bucket, storagePath);
}

function signature(bucket: string, storagePath: string, exp: string) {
  return createHmac("sha256", secret("FILE_SIGNING_SECRET", "dev-file-signing-secret"))
    .update(`${bucket}:${storagePath}:${exp}`)
    .digest("base64url");
}

export function verifyMedia(bucket: string, storagePath: string, exp: string, sig: string) {
  if (!SAFE_PATH.test(storagePath) || storagePath.includes("..")) return false;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = signature(bucket, storagePath, exp);
  return safeEqual(expected, sig);
}

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function putBlob(bucket: Bucket, storagePath: string, bytes: Buffer, contentType: string) {
  if (usingSupabase()) {
    const { error } = await supabase().storage.from(bucket).upload(storagePath, bytes, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    return;
  }
  const target = localPath(bucket, storagePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function readBlob(bucket: Bucket, storagePath: string) {
  if (usingSupabase()) {
    const { data, error } = await supabase().storage.from(bucket).download(storagePath);
    if (error || !data) return null;
    return { bytes: Buffer.from(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
  }
  try {
    const bytes = await readFile(localPath(bucket, storagePath));
    const contentType = storagePath.endsWith(".png")
      ? "image/png"
      : storagePath.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return { bytes, contentType };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteBlob(bucket: Bucket, storagePath: string) {
  if (usingSupabase()) {
    await supabase().storage.from(bucket).remove([storagePath]);
    return;
  }
  await rm(localPath(bucket, storagePath), { force: true });
}

export async function signedBlobUrl(bucket: Bucket, storagePath: string, ttlSeconds: number, download = false, base?: string) {
  if (usingSupabase()) {
    const { data, error } = await supabase().storage.from(bucket).createSignedUrl(storagePath, ttlSeconds, {
      download: download ? path.basename(storagePath) : undefined,
    });
    if (error || !data) throw new Error(error?.message || "Could not sign the file URL");
    return data.signedUrl;
  }
  const exp = String(Date.now() + ttlSeconds * 1000);
  const sig = signature(bucket, storagePath, exp);
  const downloadQuery = download ? "&download=1" : "";
  const root = (base || appUrl()).replace(/\/$/, "");
  return `${root}/api/media?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(storagePath)}&exp=${exp}&sig=${sig}${downloadQuery}`;
}
