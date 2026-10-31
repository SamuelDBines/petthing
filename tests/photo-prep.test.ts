import assert from "node:assert/strict";
import test from "node:test";
import { MAX_UPLOAD_BYTES, UNREADABLE_PHOTO, describeFailure, preparePhoto, sniffPhotoKind } from "../lib/pawtraitry/photo-prep";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const HEIC = new Uint8Array([0, 0, 0, 0x18, ...Buffer.from("ftypheic"), 0, 0, 0, 0]);
const deps = (over: Partial<Parameters<typeof preparePhoto>[1]> = {}) => ({
  readHead: async (b: Blob) => new Uint8Array(await b.slice(0, 32).arrayBuffer()),
  heicToJpeg: async () => new Blob([JPEG], { type: "image/jpeg" }),
  compress: async (f: File) => new Blob([await f.arrayBuffer()], { type: "image/jpeg" }),
  ...over,
});

test("sniff: detects HEIC by bytes even with no name or type (Android picker)", () => {
  assert.equal(sniffPhotoKind(HEIC, "1000012345", ""), "heic");
  assert.equal(sniffPhotoKind(JPEG), "jpeg");
  assert.equal(sniffPhotoKind(new Uint8Array(12), "x.HEIF"), "heic");
});

test("describeFailure: non-Error rejections (heic2any) give a readable message", () => {
  assert.equal(describeFailure({ code: 2, message: "ERR_LIBHEIF format not supported" }), "ERR_LIBHEIF format not supported");
  assert.equal(describeFailure(undefined), "Something went wrong");
});

test("prepare: compression failing in worker and main thread falls back to the original JPEG", async () => {
  const file = new File([JPEG], "IMG.jpg", { type: "image/jpeg" });
  const out = await preparePhoto(file, deps({ compress: async () => { throw new Error("canvas too big"); } }));
  assert.equal(out.blob, file);
  assert.ok(out.steps.includes("original"));
});

test("prepare: worker failure retries on main thread", async () => {
  const out = await preparePhoto(new File([JPEG], "a.jpg"), deps({
    compress: async (f, worker) => { if (worker) throw new Error("worker blocked"); return new Blob([await f.arrayBuffer()]); },
  }));
  assert.deepEqual(out.steps, ["compress-failed:true:worker blocked", "compressed-main"]);
});

test("prepare: unconvertible HEIC gives a clear message, not a generic failure", async () => {
  const file = new File([HEIC], "1000012345", { type: "" });
  await assert.rejects(preparePhoto(file, deps({ heicToJpeg: () => Promise.reject({ code: 2 }) })), (e: Error) => e.message === UNREADABLE_PHOTO);
});

test("prepare: oversized unreadable file explains size", async () => {
  const big = new File([JPEG, new Uint8Array(MAX_UPLOAD_BYTES)], "a.jpg");
  await assert.rejects(preparePhoto(big, deps({ compress: async () => { throw new Error("oom"); } })), /too large/);
});

test("copyPickedFile: copies bytes so a later-revoked handle is not needed", async () => {
  const { copyPickedFile } = await import("../lib/pawtraitry/photo-prep");
  let reads = 0;
  const flaky = ({
    name: "cat.jpg", type: "image/jpeg", lastModified: 1,
    arrayBuffer: async () => { if (reads++) throw new DOMException("The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.", "NotReadableError"); return JPEG.buffer.slice(0); },
  }) as unknown as File;
  const copy = await copyPickedFile(flaky);
  await assert.rejects(() => flaky.arrayBuffer());
  assert.deepEqual(new Uint8Array(await copy.arrayBuffer()), JPEG);
  assert.equal(copy.name, "cat.jpg");
  const result = await preparePhoto(copy, deps());
  assert.ok(result.blob.size > 0);
});

test("copyPickedFile: unreadable file gives friendly re-pick copy", async () => {
  const { copyPickedFile, REPICK_PHOTO } = await import("../lib/pawtraitry/photo-prep");
  const bad = { name: "x", type: "", lastModified: 0, arrayBuffer: async () => { throw new DOMException("The requested file could not be read", "NotReadableError"); } } as unknown as File;
  await assert.rejects(() => copyPickedFile(bad), (e: Error) => e.message === REPICK_PHOTO);
  const empty = { name: "x", type: "", lastModified: 0, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as File;
  await assert.rejects(() => copyPickedFile(empty), (e: Error) => e.message === REPICK_PHOTO);
});

test("describeFailure: DOMException and raw browser text map to friendly copy without em dashes", async () => {
  const { REPICK_PHOTO } = await import("../lib/pawtraitry/photo-prep");
  const raw = "The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.";
  assert.equal(describeFailure(new DOMException(raw, "NotReadableError")), REPICK_PHOTO);
  assert.equal(describeFailure(new Error(raw)), REPICK_PHOTO);
  assert.equal(describeFailure(raw), REPICK_PHOTO);
  assert.equal(describeFailure({ name: "NotFoundError", message: "x" }), REPICK_PHOTO);
  assert.equal(describeFailure(new Error("Email limit reached")), "Email limit reached");
  assert.ok(!REPICK_PHOTO.includes("\u2014"));
});
