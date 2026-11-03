import sharp from "sharp";

export async function readPortraitDimensions(buffer: Buffer) {
  const meta = await sharp(buffer).rotate().metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

/** Hide a print size when the source is far too small to cover-crop acceptably. */
export function portraitMeetsPrintMinimum(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) return false;
  const scaleW = sourceWidth / targetWidth;
  const scaleH = sourceHeight / targetHeight;
  const coverScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const effectiveShort = Math.min(sourceWidth / coverScale, sourceHeight / coverScale);
  return effectiveShort >= Math.min(targetWidth, targetHeight) * 0.35;
}
