import sharp from "sharp";
import { sheetPixels, type PrintSheet } from "@/config/prints";

const PAPER = { r: 243, g: 239, b: 232 };

/** Place the whole portrait inside the puzzle or lid, with paper either side. The boards are landscape and the portraits are not. */
export async function composePrint(source: Buffer, sheet: PrintSheet) {
  const { width, height } = sheetPixels(sheet);
  const fitted = sharp(source).rotate();
  const meta = await fitted.metadata();
  const sourceWidth = meta.width ?? 1;
  const sourceHeight = meta.height ?? 1;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const fittedWidth = Math.max(1, Math.round(sourceWidth * scale));
  const fittedHeight = Math.max(1, Math.round(sourceHeight * scale));
  const resized = await fitted.resize(fittedWidth, fittedHeight, { fit: "fill" }).jpeg({ quality: 90 }).toBuffer();
  return sharp({ create: { width, height, channels: 3, background: PAPER } })
    .composite([{ input: resized, left: Math.round((width - fittedWidth) / 2), top: Math.round((height - fittedHeight) / 2) }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
