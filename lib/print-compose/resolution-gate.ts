/** Hide a print size when the source is far too small to cover-crop acceptably. */
export function portraitMeetsPrintMinimum(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) return false;
  const coverScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const effectiveShort = Math.min(sourceWidth / coverScale, sourceHeight / coverScale);
  return effectiveShort >= Math.min(targetWidth, targetHeight) * 0.35;
}
