// Turns whatever a phone's file picker hands us into an upload the server accepts.
// Every step can fail on real devices (HEIC variants, huge camera photos, workers
// blocked), so each failure falls back to the next option instead of killing the flow.

export const MAX_UPLOAD_BYTES = 8_000_000;
export type PhotoKind = "jpeg" | "png" | "webp" | "heic" | "unknown";

export function sniffPhotoKind(bytes: Uint8Array, name = "", type = ""): PhotoKind {
  const at = (i: number, s: string) => [...s].every((c, j) => bytes[i + j] === c.charCodeAt(0));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && at(1, "PNG")) return "png";
  if (at(0, "RIFF") && at(8, "WEBP")) return "webp";
  if (at(4, "ftyp")) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return "heic";
  }
  if (/\.hei[cf]$/i.test(name) || /hei[cf]/i.test(type)) return "heic";
  return "unknown";
}

export const REPICK_PHOTO =
  "We lost access to that photo. Please choose it again, or save it to your phone first and pick it from your gallery.";

// Browser DOMException text (NotReadableError etc.) is meaningless to customers.
const BROWSER_ERROR_NAMES = new Set(["NotReadableError", "NotFoundError", "SecurityError", "NotAllowedError", "AbortError", "EncodingError", "InvalidStateError"]);
const RAW_BROWSER_TEXT = /could not be read|permission problems|reference to a file|requested file|NotReadableError|DOMException/i;

export function isBrowserFileError(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return typeof reason === "string" && RAW_BROWSER_TEXT.test(reason);
  const r = reason as { name?: unknown; message?: unknown };
  if (typeof DOMException !== "undefined" && reason instanceof DOMException) return true;
  if (typeof r.name === "string" && BROWSER_ERROR_NAMES.has(r.name)) return true;
  return typeof r.message === "string" && RAW_BROWSER_TEXT.test(r.message);
}

export function describeFailure(reason: unknown, fallback = "Something went wrong"): string {
  if (isBrowserFileError(reason)) return REPICK_PHOTO;
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  if (reason && typeof reason === "object" && "message" in reason && typeof (reason as { message: unknown }).message === "string") {
    return (reason as { message: string }).message || fallback;
  }
  return fallback;
}

export const UNREADABLE_PHOTO =
  "We could not read that photo on this device. Try a different photo, or take a screenshot of it and upload that.";

export type PrepDeps = {
  readHead: (file: Blob) => Promise<Uint8Array>;
  heicToJpeg: (file: Blob) => Promise<Blob>;
  compress: (file: File, useWebWorker: boolean) => Promise<Blob>;
};

export type PrepResult = { blob: Blob; kind: PhotoKind; steps: string[] };

export async function preparePhoto(file: File, deps: PrepDeps): Promise<PrepResult> {
  const steps: string[] = [];
  const kind = sniffPhotoKind(await deps.readHead(file), file.name, file.type);
  let source: Blob = file;
  if (kind === "heic") {
    try {
      source = await deps.heicToJpeg(file);
      steps.push("heic-converted");
    } catch (reason) {
      steps.push(`heic-failed:${describeFailure(reason, "unknown")}`);
      throw Object.assign(new Error(UNREADABLE_PHOTO), { steps });
    }
  }
  const asFile = new File([source], "photo.jpg", { type: source.type || "image/jpeg" });
  for (const worker of [true, false]) {
    try {
      const out = await deps.compress(asFile, worker);
      if (out && out.size > 0) {
        steps.push(worker ? "compressed-worker" : "compressed-main");
        return { blob: out, kind, steps };
      }
      steps.push(`compress-empty:${worker}`);
    } catch (reason) {
      steps.push(`compress-failed:${worker}:${describeFailure(reason, "unknown")}`);
    }
  }
  // Compression is a nicety. A JPEG/PNG/WebP the server can take as-is still works.
  if ((kind === "jpeg" || kind === "png" || kind === "webp" || source !== file) && source.size <= MAX_UPLOAD_BYTES) {
    steps.push("original");
    return { blob: source, kind, steps };
  }
  const message = source.size > MAX_UPLOAD_BYTES ? "That photo is too large for this device to shrink. Try a smaller photo or a screenshot of it." : UNREADABLE_PHOTO;
  throw Object.assign(new Error(message), { steps });
}

// Android (Google Photos / cloud pickers) can revoke a picked file's content URI
// soon after selection. Copy the bytes into memory straight away so nothing later
// depends on the original handle.
export async function copyPickedFile(file: File): Promise<File> {
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch (reason) {
    throw Object.assign(new Error(REPICK_PHOTO), { steps: [`copy-failed:${reason && typeof reason === "object" && "name" in reason ? String((reason as { name: unknown }).name) : "unknown"}`] });
  }
  if (!buf.byteLength) throw Object.assign(new Error(REPICK_PHOTO), { steps: ["copy-empty"] });
  return new File([buf], file.name || "photo", { type: file.type, lastModified: file.lastModified });
}
