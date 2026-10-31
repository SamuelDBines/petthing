import sharp from "sharp";
import { APP_NAME } from "@/config/brand";

export async function watermark(bytes: Buffer, options: { width?: number } = {}) {
  const targetWidth = options.width ?? 900;
  const resized = await sharp(bytes).rotate().resize({ width: targetWidth, withoutEnlargement: true }).toBuffer();
  const image = sharp(resized);
  const meta = await image.metadata();
  const width = meta.width ?? targetWidth;
  const height = meta.height ?? Math.round(targetWidth * 1.33);
  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="white" fill-opacity="0.72" font-size="${Math.round(width / 14)}"
        font-family="Georgia, serif" transform="rotate(-18 ${width / 2} ${height / 2})">${APP_NAME}</text>
    </svg>
  `);
  return image.composite([{ input: overlay }]).jpeg({ quality: 78 }).toBuffer();
}
